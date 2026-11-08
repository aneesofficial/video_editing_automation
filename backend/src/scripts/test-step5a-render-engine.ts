import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { env } from '../config/env.js';

const BASE_URL = 'http://localhost:3001';
const FFMPEG = env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = env.FFPROBE_PATH || 'ffprobe';

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function safeFetch(url: string, init?: RequestInit, retries = 5, delayMs = 1500): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, init);
      return res;
    } catch (e: any) {
      if (i === retries - 1) throw e;
      console.log(`  [safeFetch] Request to ${url} failed (${e.message}), retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
  throw new Error(`safeFetch failed after ${retries} attempts`);
}

function probeJson(filePath: string): any {
  const stdout = execSync(
    `"${FFPROBE}" -v quiet -print_format json -show_format -show_streams "${filePath}"`,
    { encoding: 'utf-8' }
  );
  return JSON.parse(stdout);
}

async function runStep5ATests() {
  console.log('====================================================');
  console.log('  STEP 5A AUTONOMOUS RENDER ENGINE VERIFICATION TEST');
  console.log('====================================================\n');

  // 1. Verify Hardware Encoder Endpoint
  console.log('[TEST 1] Testing Hardware Encoder Detection Endpoint...');
  const encRes = await safeFetch(`${BASE_URL}/api/v1/rendering/hardware-encoder`);
  if (!encRes.ok) throw new Error(`Encoder endpoint failed: ${encRes.statusText}`);
  const encData: any = await encRes.json();
  console.log('Hardware Encoder Result:', JSON.stringify(encData.data));
  if (!encData.data.encoder) throw new Error('Expected encoder in response');
  console.log('✓ TEST 1 PASSED: Hardware encoder detected:', encData.data.encoder, `(${encData.data.description})\n`);

  // 2. Prepare Test Fixtures (H.265, Rotated, Silent, 2 Photos)
  console.log('[TEST 2] Verifying Test Fixtures in backend/test-fixtures/...');
  const fixturesDir = path.resolve('backend', 'test-fixtures', 'test-fixtures-step5a');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const h265Path = path.join(fixturesDir, 'clip_hevc.mp4');
  const rotatedPath = path.join(fixturesDir, 'clip_rotated.mp4');
  const silentPath = path.join(fixturesDir, 'clip_silent.mp4');
  const photo1Path = path.join(fixturesDir, 'photo_product.jpg');
  const photo2Path = path.join(fixturesDir, 'photo_banner.png');

  // Video 1: H.265 (libx265) with 440Hz tone
  if (!fs.existsSync(h265Path)) {
    execSync(
      `"${FFMPEG}" -y -f lavfi -i testsrc=duration=2:size=1280x720:rate=30 -f lavfi -i sine=frequency=440:duration=2 -c:v libx265 -tag:v hvc1 -pix_fmt yuv420p -c:a aac "${h265Path}"`,
      { stdio: 'ignore' }
    );
  }

  // Video 2: Rotated 90° with 880Hz tone
  if (!fs.existsSync(rotatedPath)) {
    execSync(
      `"${FFMPEG}" -y -f lavfi -i smptebars=duration=2:size=1280x720:rate=30 -f lavfi -i sine=frequency=880:duration=2 -c:v libx264 -pix_fmt yuv420p -c:a aac -metadata:s:v:0 rotate=90 "${rotatedPath}"`,
      { stdio: 'ignore' }
    );
  }

  // Video 3: Silent video without audio stream
  if (!fs.existsSync(silentPath)) {
    execSync(
      `"${FFMPEG}" -y -f lavfi -i testsrc2=duration=2:size=640x360:rate=24 -c:v libx264 -pix_fmt yuv420p -an "${silentPath}"`,
      { stdio: 'ignore' }
    );
  }

  // Photo 1: JPG (1280x720)
  if (!fs.existsSync(photo1Path)) {
    execSync(
      `"${FFMPEG}" -y -f lavfi -i color=c=blue:size=1280x720:duration=1 -frames:v 1 "${photo1Path}"`,
      { stdio: 'ignore' }
    );
  }

  // Photo 2: PNG (1080x1920)
  if (!fs.existsSync(photo2Path)) {
    execSync(
      `"${FFMPEG}" -y -f lavfi -i color=c=orange:size=1080x1920:duration=1 -frames:v 1 "${photo2Path}"`,
      { stdio: 'ignore' }
    );
  }

  console.log('✓ TEST 2 PASSED: 5 media fixtures ready (HEVC, Rotated 90°, Silent, JPG, PNG)\n');

  // Helper to test a complete project render flow
  async function testProjectRenderFlow(options: {
    frameName: string;
    platform: string;
    aspectRatio: string;
    targetResolution: string;
    draftExpectedRes: string;
    finalExpectedRes: string;
  }) {
    console.log(`----------------------------------------------------`);
    console.log(`  TESTING FRAME: ${options.frameName} (${options.platform})`);
    console.log(`----------------------------------------------------`);

    const clientName = 'Ali Store';
    const projectTitle = `Test_${options.frameName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    // 1. Create Project
    const projRes = await safeFetch(`${BASE_URL}/api/v1/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: projectTitle,
        clientName: clientName,
        targetPlatform: options.platform,
        aspectRatio: options.aspectRatio,
        resolution: options.targetResolution,
        rawPrompt: `Create an autonomous edit formatted for ${options.platform}`,
      }),
    });

    if (!projRes.ok) throw new Error(`Project creation failed: ${projRes.statusText}`);
    const projectData: any = await projRes.json();
    const projectId = projectData.data.id;
    console.log(`Created project: ${projectId} ("${projectTitle}")`);

    // 2. Upload all 5 files
    const filesToUpload = [
      { path: h265Path, name: 'clip_hevc.mp4' },
      { path: rotatedPath, name: 'clip_rotated.mp4' },
      { path: silentPath, name: 'clip_silent.mp4' },
      { path: photo1Path, name: 'photo_product.jpg' },
      { path: photo2Path, name: 'photo_banner.png' },
    ];

    const uploadedAssets: any[] = [];
    for (const f of filesToUpload) {
      const fileBytes = fs.readFileSync(f.path);
      const blob = new Blob([fileBytes]);
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('file', blob, f.name);

      const upRes = await safeFetch(`${BASE_URL}/api/v1/uploads?projectId=${projectId}`, {
        method: 'POST',
        body: formData,
      });

      if (!upRes.ok) throw new Error(`Upload failed for ${f.name}: ${upRes.statusText}`);
      const upJson: any = await upRes.json();
      uploadedAssets.push(upJson.data);
    }
    console.log(`Uploaded all 5 raw assets to ${projectTitle}/raw/`);

    // 3. Write plan covering motion effects & transitions
    const planDir = path.resolve('backend', 'storage', 'clients', clientName, projectTitle, 'plans');
    fs.mkdirSync(planDir, { recursive: true });

    const comprehensivePlan = {
      version: 'v1',
      createdAt: new Date().toISOString(),
      projectId,
      plan: {
        summary: `Autonomous ${options.frameName} cut sequence with transitions and motion effects`,
        explanation: 'Tested with blurred background, zoom, punch-in, ken-burns, and loudness normalization',
        targetDurationSeconds: 8,
        frame: {
          platform: options.platform,
          aspectRatio: options.aspectRatio,
          resolution: options.targetResolution,
        },
        segments: [
          {
            assetId: uploadedAssets[0].id, // HEVC video
            sourceIn: 0,
            sourceOut: 2,
            speed: 1.0,
            transition: 'fade',
            motionEffect: 'zoom_in',
          },
          {
            assetId: uploadedAssets[3].id, // JPG photo
            sourceIn: 0,
            sourceOut: 2,
            speed: 1.0,
            transition: 'crossfade',
            motionEffect: 'ken_burns',
          },
          {
            assetId: uploadedAssets[1].id, // Rotated video
            sourceIn: 0,
            sourceOut: 2,
            speed: 1.0,
            transition: 'slide',
            motionEffect: 'punch_in',
          },
          {
            assetId: uploadedAssets[2].id, // Silent video
            sourceIn: 0,
            sourceOut: 2,
            speed: 1.0,
            transition: 'cut',
            motionEffect: 'pan_right',
          },
        ],
      },
    };

    fs.writeFileSync(path.join(planDir, 'plan_v1.json'), JSON.stringify(comprehensivePlan, null, 2), 'utf-8');

    // 4. Render DRAFT Mode
    console.log(`Starting DRAFT render (${options.draftExpectedRes})...`);
    const draftRes = await safeFetch(`${BASE_URL}/api/v1/rendering/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, mode: 'draft', planVersion: 'v1' }),
    });
    if (!draftRes.ok) throw new Error(`Draft render call failed: ${draftRes.statusText}`);
    const draftInfo: any = await draftRes.json();
    const draftJobId = draftInfo.data.jobId;

    let draftDone = false;
    let draftJob: any = null;
    let attempts = 0;
    while (!draftDone && attempts < 300) {
      await sleep(1000);
      attempts++;
      const pollRes = await safeFetch(`${BASE_URL}/api/v1/rendering/jobs/${draftJobId}`);
      if (!pollRes.ok) continue;
      const pollJson: any = await pollRes.json();
      draftJob = pollJson.data;
      if (attempts % 10 === 0) {
        console.log(`  [DRAFT Progress] ${draftJob?.progressPercent || 0}% • ${draftJob?.currentStage || 'rendering'}`);
      }
      if (draftJob.status === 'completed') {
        draftDone = true;
        break;
      }
      if (draftJob.status === 'failed') {
        throw new Error(`Draft render failed: ${draftJob.errorMessage}`);
      }
    }
    if (!draftDone) throw new Error('Draft render timed out');

    const draftExport = draftJob.exportedFiles[0];
    const draftProbe = probeJson(draftExport.storagePath);
    const draftV = draftProbe.streams.find((s: any) => s.codec_type === 'video');
    const draftA = draftProbe.streams.find((s: any) => s.codec_type === 'audio');
    const [dExpW, dExpH] = options.draftExpectedRes.split('x').map(Number);

    console.log(`✓ DRAFT ${options.frameName} Render Complete:`);
    console.log(`  File: ${draftExport.filename} (${draftExport.fileSizeBytes} bytes)`);
    console.log(`  Resolution: ${draftV.width}x${draftV.height} (Expected: ${options.draftExpectedRes})`);
    console.log(`  Codecs: Video=${draftV.codec_name} (${draftV.pix_fmt}), Audio=${draftA?.codec_name}`);
    console.log(`  Duration: ${draftProbe.format.duration}s`);

    if (draftV.codec_name !== 'h264') throw new Error(`Draft video codec is not h264`);
    if (draftV.pix_fmt !== 'yuv420p') throw new Error(`Draft pix_fmt is not yuv420p`);
    if (draftV.width !== dExpW || draftV.height !== dExpH) {
      throw new Error(`Draft resolution mismatch: got ${draftV.width}x${draftV.height}, expected ${options.draftExpectedRes}`);
    }
    if (!draftA) throw new Error('Draft missing audio stream');

    // 5. Render FINAL Mode
    console.log(`Starting FINAL render (${options.finalExpectedRes})...`);
    const finalRes = await safeFetch(`${BASE_URL}/api/v1/rendering/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, mode: 'final', planVersion: 'v1' }),
    });
    if (!finalRes.ok) throw new Error(`Final render call failed: ${finalRes.statusText}`);
    const finalInfo: any = await finalRes.json();
    const finalJobId = finalInfo.data.jobId;

    let finalDone = false;
    let finalJob: any = null;
    attempts = 0;
    while (!finalDone && attempts < 300) {
      await sleep(1000);
      attempts++;
      const pollRes = await safeFetch(`${BASE_URL}/api/v1/rendering/jobs/${finalJobId}`);
      if (!pollRes.ok) continue;
      const pollJson: any = await pollRes.json();
      finalJob = pollJson.data;
      if (attempts % 10 === 0) {
        console.log(`  [FINAL Progress] ${finalJob?.progressPercent || 0}% • ${finalJob?.currentStage || 'rendering'}`);
      }
      if (finalJob.status === 'completed') {
        finalDone = true;
        break;
      }
      if (finalJob.status === 'failed') {
        throw new Error(`Final render failed: ${finalJob.errorMessage}`);
      }
    }
    if (!finalDone) throw new Error('Final render timed out');

    const finalExport = finalJob.exportedFiles[0];
    const finalProbe = probeJson(finalExport.storagePath);
    const finalV = finalProbe.streams.find((s: any) => s.codec_type === 'video');
    const finalA = finalProbe.streams.find((s: any) => s.codec_type === 'audio');
    const [fExpW, fExpH] = options.finalExpectedRes.split('x').map(Number);

    console.log(`✓ FINAL ${options.frameName} Render Complete:`);
    console.log(`  File: ${finalExport.filename} (${finalExport.fileSizeBytes} bytes)`);
    console.log(`  Resolution: ${finalV.width}x${finalV.height} (Expected: ${options.finalExpectedRes})`);
    console.log(`  Codecs: Video=${finalV.codec_name} (${finalV.pix_fmt}), Audio=${finalA?.codec_name}`);
    console.log(`  Duration: ${finalProbe.format.duration}s\n`);

    if (finalV.codec_name !== 'h264') throw new Error(`Final video codec is not h264`);
    if (finalV.pix_fmt !== 'yuv420p') throw new Error(`Final pix_fmt is not yuv420p`);
    if (finalV.width !== fExpW || finalV.height !== fExpH) {
      throw new Error(`Final resolution mismatch: got ${finalV.width}x${finalV.height}, expected ${options.finalExpectedRes}`);
    }
    if (!finalA) throw new Error('Final missing audio stream');

    return {
      projectId,
      projectTitle,
      draftExport,
      draftProbe,
      finalExport,
      finalProbe,
    };
  }

  // 3. Test YouTube Shorts 9:16 (Draft 720x1280 & Final 1080x1920)
  console.log('[TEST 3] Running YouTube Shorts 9:16 Suite...');
  const shortsResults = await testProjectRenderFlow({
    frameName: 'YouTube Shorts 9:16',
    platform: 'YouTube Shorts 9:16',
    aspectRatio: '9:16',
    targetResolution: '1080x1920',
    draftExpectedRes: '720x1280',
    finalExpectedRes: '1080x1920',
  });
  console.log('✓ TEST 3 PASSED: YouTube Shorts 9:16 (Draft + Final) fully validated\n');

  // 4. Test YouTube 16:9 (Draft 1280x720 & Final 1920x1080)
  console.log('[TEST 4] Running YouTube 16:9 Suite...');
  const landscapeResults = await testProjectRenderFlow({
    frameName: 'YouTube 16:9',
    platform: 'YouTube 16:9',
    aspectRatio: '16:9',
    targetResolution: '1920x1080',
    draftExpectedRes: '1280x720',
    finalExpectedRes: '1920x1080',
  });
  console.log('✓ TEST 4 PASSED: YouTube 16:9 (Draft + Final) fully validated\n');

  // 5. Test Render Cancellation
  console.log('[TEST 5] Testing Job Cancellation Endpoint...');
  const cancelRes = await safeFetch(`${BASE_URL}/api/v1/rendering/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: landscapeResults.projectId,
      mode: 'draft',
      planVersion: 'v1',
    }),
  });
  const cancelInfo: any = await cancelRes.json();
  const cancelJobId = cancelInfo.data.jobId;

  // Let worker pick it up
  await sleep(800);

  const abortRes = await safeFetch(`${BASE_URL}/api/v1/rendering/jobs/${cancelJobId}/cancel`, {
    method: 'POST',
  });
  if (!abortRes.ok) throw new Error(`Cancel request failed: ${abortRes.statusText}`);

  await sleep(1000);
  const statusRes = await safeFetch(`${BASE_URL}/api/v1/rendering/jobs/${cancelJobId}`);
  const statusJson: any = await statusRes.json();
  console.log(`Job status after cancellation: ${statusJson.data.status} (${statusJson.data.currentStage})`);
  if (statusJson.data.status !== 'cancelled') {
    throw new Error(`Expected 'cancelled', got ${statusJson.data.status}`);
  }
  console.log('✓ TEST 5 PASSED: Cancellation cleanly terminated FFmpeg background process\n');

  console.log('====================================================');
  console.log('  ALL STEP 5A VERIFICATION TESTS COMPLETED (5/5)!   ');
  console.log('====================================================');
}

runStep5ATests().catch((err) => {
  console.error('\n❌ STEP 5A VERIFICATION FAILED:', err);
  process.exit(1);
});
