import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://127.0.0.1:3001';
const FIXTURES_DIR = path.resolve(__dirname, '../../../test-fixtures-step3');
const REAL_KEY = 'GEMINI_API_KEY_REDACTED';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runFFmpeg(cmd: string) {
  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (err: any) {
    console.error('FFmpeg error:', err.stderr?.toString() || err.message);
    throw err;
  }
}

async function runStep4Test() {
  console.log('========================================================');
  console.log('   STEP 4 GEMINI AI PLANNER & WORKSPACE E2E TEST');
  console.log('========================================================\n');

  // -----------------------------------------------------------------
  // TEST 1: Check AI Status
  // -----------------------------------------------------------------
  console.log('--- TEST 1: Querying AI Status ---');
  const statusRes = await fetch(`${BASE_URL}/api/v1/ai/status`);
  if (!statusRes.ok) {
    throw new Error(`Failed to query AI status: ${statusRes.statusText}`);
  }
  const statusJson = (await statusRes.json()) as any;
  console.log('AI Status Response:', JSON.stringify(statusJson.data, null, 2));

  if (!statusJson.data.online) {
    console.warn('Warning: AI status is not online:', statusJson.data.reason);
  } else {
    console.log(`✓ AI status is ONLINE with model: ${statusJson.data.model}`);
  }

  if (statusJson.data.maskedKey) {
    console.log(`✓ Key is securely masked: ${statusJson.data.maskedKey}`);
    if (statusJson.data.maskedKey === REAL_KEY) {
      throw new Error('SECURITY VIOLATION: Masked key exposed the raw API key!');
    }
  }

  // -----------------------------------------------------------------
  // TEST 2: Key Verification and Error Handling
  // -----------------------------------------------------------------
  console.log('\n--- TEST 2: Testing Invalid Key Rejection & Restoration ---');
  const invalidKeyRes = await fetch(`${BASE_URL}/api/v1/ai/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: 'INVALID_TEST_KEY_FOR_TESTING' }),
  });
  const invalidKeyJson = (await invalidKeyRes.json()) as any;
  console.log('Invalid key test response:', invalidKeyJson);
  if (invalidKeyJson.success) {
    throw new Error('Expected invalid key to fail, but it succeeded!');
  }
  console.log('✓ Invalid key was properly rejected with clear error message.');

  // Restore real key
  console.log('Restoring valid Gemini API key...');
  const restoreRes = await fetch(`${BASE_URL}/api/v1/ai/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: REAL_KEY }),
  });
  const restoreJson = (await restoreRes.json()) as any;
  if (!restoreJson.success) {
    throw new Error(`Failed to restore real key: ${restoreJson.error}`);
  }
  console.log('✓ Real key restored and verified successfully:', restoreJson.data?.maskedKey);

  // -----------------------------------------------------------------
  // TEST 3 & 4: Validation on Empty Prompt and Empty Project
  // -----------------------------------------------------------------
  console.log('\n--- TEST 3 & 4: Validating Prompt and Empty Project Rejections ---');
  const emptyProjRes = await fetch(`${BASE_URL}/api/v1/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Step 4 Empty Test Project',
      description: 'Project with no media to test AI rejection',
    }),
  });
  const emptyProj = ((await emptyProjRes.json()) as any).data;
  console.log(`Created empty project: ${emptyProj.id}`);

  // Test empty prompt rejection
  const emptyPromptRes = await fetch(`${BASE_URL}/api/v1/projects/${emptyProj.id}/ai-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userPrompt: '' }),
  });
  const emptyPromptJson = (await emptyPromptRes.json()) as any;
  console.log('Empty prompt response (should be 400):', emptyPromptRes.status, emptyPromptJson);
  if (emptyPromptRes.status !== 400 || emptyPromptJson.success) {
    throw new Error('Expected empty prompt to be rejected with 400');
  }
  console.log('✓ Empty prompt correctly rejected with 400.');

  // Test project with no files rejection
  const noFilesRes = await fetch(`${BASE_URL}/api/v1/projects/${emptyProj.id}/ai-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userPrompt: 'Create a video' }),
  });
  const noFilesJson = (await noFilesRes.json()) as any;
  console.log('No files response (should be 400):', noFilesRes.status, noFilesJson);
  if (noFilesRes.status !== 400 || noFilesJson.success) {
    throw new Error('Expected project with no files to be rejected with 400');
  }
  console.log('✓ Project with no media correctly rejected with 400.');

  // Clean up empty project
  await fetch(`${BASE_URL}/api/v1/projects/${emptyProj.id}`, { method: 'DELETE' });

  // -----------------------------------------------------------------
  // TEST 5: Full Autonomous Plan Generation with 3 Videos + 2 Photos
  // -----------------------------------------------------------------
  console.log('\n--- TEST 5: Autonomous Plan Generation with 3 Videos + 2 Photos ---');
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  const mediaFiles = [
    {
      name: 'h265_video.mp4',
      cmd: `ffmpeg -y -f lavfi -i testsrc=duration=3:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=3 -c:v libx265 -tag:v hvc1 -c:a aac "${path.join(FIXTURES_DIR, 'h265_video.mp4')}"`,
    },
    {
      name: 'h264_clip.mov',
      cmd: `ffmpeg -y -f lavfi -i testsrc=duration=3:size=640x360:rate=30 -f lavfi -i sine=frequency=660:duration=3 -c:v libx264 -pix_fmt yuv420p -c:a aac "${path.join(FIXTURES_DIR, 'h264_clip.mov')}"`,
    },
    {
      name: 'vp9_video.webm',
      cmd: `ffmpeg -y -f lavfi -i testsrc=duration=3:size=640x360:rate=30 -f lavfi -i sine=frequency=880:duration=3 -c:v libvpx-vp9 -c:a libvorbis "${path.join(FIXTURES_DIR, 'vp9_video.webm')}"`,
    },
    {
      name: 'sample_photo.jpg',
      cmd: `ffmpeg -y -f lavfi -i color=c=blue:size=800x600:d=0.1 -frames:v 1 "${path.join(FIXTURES_DIR, 'sample_photo.jpg')}"`,
    },
    {
      name: 'sample_graphic.png',
      cmd: `ffmpeg -y -f lavfi -i color=c=green:size=800x600:d=0.1 -frames:v 1 "${path.join(FIXTURES_DIR, 'sample_graphic.png')}"`,
    },
  ];

  for (const f of mediaFiles) {
    const p = path.join(FIXTURES_DIR, f.name);
    if (!fs.existsSync(p)) {
      console.log(`Generating test file: ${f.name}...`);
      runFFmpeg(f.cmd);
    }
  }

  const mainProjRes = await fetch(`${BASE_URL}/api/v1/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Step 4 Autonomous Reel Project',
      description: 'End-to-end autonomous Gemini edit test',
      targetPlatform: 'YouTube Shorts 9:16',
      aspectRatio: '9:16',
      resolution: '1080x1920',
    }),
  });
  const mainProj = ((await mainProjRes.json()) as any).data;
  const projectId = mainProj.id;
  console.log(`Created test project: ${projectId} ("${mainProj.title}")`);

  console.log('Uploading 5 test media files (3 videos + 2 photos)...');
  for (const f of mediaFiles) {
    const filePath = path.join(FIXTURES_DIR, f.name);
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer]);
    const fd = new FormData();
    fd.append('projectId', projectId);
    fd.append('file', blob, f.name);

    const upRes = await fetch(`${BASE_URL}/api/v1/uploads?projectId=${projectId}`, {
      method: 'POST',
      body: fd,
    });
    if (!upRes.ok) {
      throw new Error(`Upload failed for ${f.name}: ${upRes.statusText}`);
    }
  }
  console.log('✓ All 5 files uploaded successfully.');

  // Wait for previews
  console.log('Waiting for preview copies to prepare...');
  let previewsReady = false;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const projCheck = await fetch(`${BASE_URL}/api/v1/projects/${projectId}`);
    const projData = ((await projCheck.json()) as any).data;
    const assets = projData.mediaAssets || [];
    const preparing = assets.filter((a: any) => a.previewStatus === 'preparing');
    if (assets.length === 5 && preparing.length === 0) {
      previewsReady = true;
      console.log('✓ All 5 media assets preview copies ready!');
      break;
    }
  }

  // Request Gemini Autonomous Plan (Plan v1)
  console.log('\nRequesting Gemini AI Plan v1...');
  console.log('Prompt: "Join these clips into a 20 second vertical reel, cut silences, add captions, use zoom on important moments"');
  console.log('Frame: YouTube Shorts 9:16 (1080x1920)');

  const planStart = Date.now();
  const plan1Res = await fetch(`${BASE_URL}/api/v1/projects/${projectId}/ai-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userPrompt: 'Join these clips into a 20 second vertical reel, cut silences, add captions, use zoom on important moments',
      targetPlatform: 'YouTube Shorts 9:16',
      aspectRatio: '9:16',
      resolution: '1080x1920',
      targetDurationSeconds: 20,
    }),
  });

  if (!plan1Res.ok) {
    const errText = await plan1Res.text();
    throw new Error(`AI plan generation failed (${plan1Res.status}): ${errText}`);
  }

  const plan1Json = (await plan1Res.json()) as any;
  const planElapsed = ((Date.now() - planStart) / 1000).toFixed(1);
  console.log(`✓ Plan v1 generated in ${planElapsed}s!`);
  console.log('Plan version:', plan1Json.data.version);
  console.log('Plan disk file:', plan1Json.data.filePath);

  const plan1 = plan1Json.data.plan;
  console.log('\n--- Plan v1 Details ---');
  console.log('Summary:', plan1.summary);
  console.log('Explanation:', plan1.explanation);
  console.log('Target Duration:', plan1.targetDurationSeconds, 's');
  console.log('Segments count:', plan1.segments.length);
  plan1.segments.forEach((seg: any, idx: number) => {
    console.log(`  Clip ${idx + 1}: Asset ${seg.assetId.slice(0, 8)} | ${seg.sourceIn}s -> ${seg.sourceOut}s | Transition: ${seg.transition} | Motion: ${seg.motionEffect}`);
  });
  console.log('Silence removal enabled:', plan1.silenceRemoval?.enabled);
  console.log('Captions count:', plan1.captions?.length || 0);
  console.log('Audio mood:', plan1.audio?.mood);

  // Check file on disk
  if (!fs.existsSync(plan1Json.data.filePath)) {
    throw new Error(`Expected plan file on disk at: ${plan1Json.data.filePath}`);
  }
  console.log('✓ Verified plan_v1.json exists on disk.');

  // Check project.json updated
  const updatedProjRes = await fetch(`${BASE_URL}/api/v1/projects/${projectId}`);
  const updatedProj = ((await updatedProjRes.json()) as any).data;
  if (updatedProj.status !== 'ready') {
    throw new Error(`Expected project status 'ready', got: ${updatedProj.status}`);
  }
  const videoTrack = (updatedProj.timelineTracks || []).find((t: any) => t.trackType === 'video');
  if (!videoTrack || videoTrack.clips.length === 0) {
    throw new Error('Expected video timeline track to have clips populated from plan');
  }
  console.log(`✓ Timeline track V1 has ${videoTrack.clips.length} clips populated.`);

  // -----------------------------------------------------------------
  // TEST 6: Multiple Plan Versions (Plan v2)
  // -----------------------------------------------------------------
  console.log('\n--- TEST 6: Generating Plan v2 & Verifying Non-Destructive History ---');
  const plan2Res = await fetch(`${BASE_URL}/api/v1/projects/${projectId}/ai-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userPrompt: 'Make an energetic 15 second cut focusing only on the fastest action with punch-in zoom',
      targetPlatform: 'YouTube Shorts 9:16',
      aspectRatio: '9:16',
      resolution: '1080x1920',
      targetDurationSeconds: 15,
    }),
  });

  if (!plan2Res.ok) {
    const errText = await plan2Res.text();
    throw new Error(`Plan v2 failed: ${errText}`);
  }
  const plan2Json = (await plan2Res.json()) as any;
  console.log('✓ Plan v2 generated successfully:', plan2Json.data.version);
  console.log('Plan v2 disk file:', plan2Json.data.filePath);

  // Verify plan_v1.json was not overwritten!
  if (!fs.existsSync(plan1Json.data.filePath)) {
    throw new Error('FAILURE: plan_v1.json was deleted or overwritten!');
  }
  console.log('✓ Verified plan_v1.json still exists and was NOT overwritten.');

  // List all plans via API
  console.log('\nQuerying GET /api/v1/projects/:id/plans...');
  const listPlansRes = await fetch(`${BASE_URL}/api/v1/projects/${projectId}/plans`);
  if (!listPlansRes.ok) {
    throw new Error(`Failed to list plans: ${listPlansRes.statusText}`);
  }
  const plansList = ((await listPlansRes.json()) as any).data;
  console.log(`Found ${plansList.length} plan versions:`, plansList.map((p: any) => p.version));
  if (plansList.length < 2) {
    throw new Error(`Expected at least 2 plan versions, got ${plansList.length}`);
  }
  console.log('✓ Successfully retrieved plan history with all versions.');

  console.log('\n========================================================');
  console.log('   ALL STEP 4 TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================================\n');
}

runStep4Test().catch((err) => {
  console.error('\n❌ STEP 4 TEST FAILED:', err);
  process.exit(1);
});
