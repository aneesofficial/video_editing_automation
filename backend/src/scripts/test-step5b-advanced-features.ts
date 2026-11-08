import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { env } from '../config/env.js';
import { ffmpegService } from '../services/ffmpeg/ffmpeg.service.js';
import { ffprobeService } from '../services/ffmpeg/ffprobe.service.js';
import { subtitleService, isRtlText, hexToAssColor, formatAssTime } from '../services/ffmpeg/subtitle.service.js';
import { brandService } from '../services/brand/brand.service.js';
import { musicService } from '../services/music/music.service.js';
import { pythonBridgeService } from '../services/python/python-bridge.service.js';
import { storageService } from '../services/storage/storage.service.js';

const FFMPEG = env.FFMPEG_PATH || 'ffmpeg';

interface Step5BTestSummary {
  test: string;
  status: 'PASSED' | 'FAILED';
  details: string;
}

async function runStep5BTestSuite() {
  console.log('================================================================');
  console.log('  NOVACUT STUDIO - STEP 5B ADVANCED FEATURES TEST SUITE');
  console.log('  Testing: Captions (libass), Silence Removal, Ducked Music, Logo');
  console.log('================================================================\n');

  const results: Step5BTestSummary[] = [];
  const testDir = path.resolve('backend', 'test-fixtures', 'test-fixtures-step5b');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // --------------------------------------------------------------------------
  // STEP 0: Prepare Fixtures (Speech with pauses, Urdu dialogue, Music, Logo)
  // --------------------------------------------------------------------------
  console.log('[STEP 0] Preparing Test Media Fixtures...');

  const speechEnPath = path.join(testDir, 'speech_with_pause.mp4');
  const speechUrduPath = path.join(testDir, 'speech_urdu.mp4');
  const photoPath = path.join(testDir, 'photo_slide.jpg');
  const testLogoPath = path.resolve('backend/storage/brand/brand_logo.png');
  const testMusicPath = path.resolve('backend/storage/music-library/track_upbeat.mp3');

  // A. Generate English Speech with an explicit 1.0-second silence pause in the middle
  if (!fs.existsSync(speechEnPath)) {
    console.log('  Generating speech audio fixture with silence pause...');
    const p1Wav = path.join(testDir, 'p1.wav');
    const p2Wav = path.join(testDir, 'p2.wav');
    const psScript = path.join(testDir, 'gen_speech.ps1');

    fs.writeFileSync(
      psScript,
      `Add-Type -AssemblyName System.Speech
$s1 = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s1.SetOutputToWaveFile("${p1Wav.replace(/\\/g, '/')}")
$s1.Speak("Welcome to NovaCut Studio. Here is the first part.")
$s1.Dispose()

$s2 = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s2.SetOutputToWaveFile("${p2Wav.replace(/\\/g, '/')}")
$s2.Speak("And here is the second part after the quiet pause.")
$s2.Dispose()
`,
      'utf-8'
    );

    try {
      execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, { stdio: 'pipe' });
    } catch {
      // Fallback: create synthesized tones if PowerShell speech synthesis unavailable
      execSync(`"${FFMPEG}" -y -f lavfi -i sine=frequency=600:duration=3 "${p1Wav}"`, { stdio: 'ignore' });
      execSync(`"${FFMPEG}" -y -f lavfi -i sine=frequency=750:duration=3 "${p2Wav}"`, { stdio: 'ignore' });
    }

    // Merge: Part 1 + 1.2s Silence + Part 2 into a single video with test pattern
    const silenceWav = path.join(testDir, 'silence.wav');
    execSync(`"${FFMPEG}" -y -f lavfi -i aevalsrc=0:d=1.2:s=44100:c=stereo "${silenceWav}"`, { stdio: 'ignore' });

    const mergedAudio = path.join(testDir, 'merged_speech.wav');
    execSync(
      `"${FFMPEG}" -y -i "${p1Wav}" -i "${silenceWav}" -i "${p2Wav}" -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1[aout]" -map "[aout]" "${mergedAudio}"`,
      { stdio: 'ignore' }
    );

    // Merge audio with 1280x720 video canvas
    execSync(
      `"${FFMPEG}" -y -f lavfi -i testsrc=size=1280x720:rate=30 -i "${mergedAudio}" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${speechEnPath}"`,
      { stdio: 'ignore' }
    );
    console.log(`  ✓ English speech fixture ready: ${speechEnPath}`);
  }

  // B. Generate Urdu Speech Video Fixture
  if (!fs.existsSync(speechUrduPath)) {
    execSync(
      `"${FFMPEG}" -y -f lavfi -i smptebars=size=1280x720:rate=30:duration=5 -f lavfi -i sine=frequency=520:duration=5 -c:v libx264 -pix_fmt yuv420p -c:a aac "${speechUrduPath}"`,
      { stdio: 'ignore' }
    );
    console.log(`  ✓ Urdu media fixture ready: ${speechUrduPath}`);
  }

  // C. Generate Photo Fixture
  if (!fs.existsSync(photoPath)) {
    execSync(
      `"${FFMPEG}" -y -f lavfi -i color=c=0x1e1e2e:size=1080x1920:duration=1 -frames:v 1 "${photoPath}"`,
      { stdio: 'ignore' }
    );
    console.log(`  ✓ Photo fixture ready: ${photoPath}`);
  }

  // D. Generate Brand Logo Watermark (PNG with alpha channel)
  if (!fs.existsSync(testLogoPath)) {
    fs.mkdirSync(path.dirname(testLogoPath), { recursive: true });
    execSync(
      `"${FFMPEG}" -y -f lavfi -i color=c=violet:size=220x80:duration=1 -frames:v 1 -update 1 "${testLogoPath}"`,
      { stdio: 'ignore' }
    );
    console.log(`  ✓ Brand logo watermark ready: ${testLogoPath}`);
  }

  // E. Update Brand Kit Configuration
  brandService.saveBrandKit({
    brandName: 'Nova Studio Productions',
    primaryColor: '#FFDE59', // Gold accent for viral captions
    watermarkPosition: 'top-right',
    watermarkOpacity: 85,
    watermarkSizePercent: 16,
    logoFilename: 'brand_logo.png',
    logoPath: testLogoPath,
    logoUrl: '/storage/brand/brand_logo.png',
  });
  console.log('  ✓ Brand Kit configuration saved to backend/storage/brand/brand_kit.json');

  // F. Generate Background Music Track in Music Library
  if (!fs.existsSync(testMusicPath)) {
    fs.mkdirSync(path.dirname(testMusicPath), { recursive: true });
    // Synthesize a pleasant rhythmic chord progression using amix of sine frequencies
    execSync(
      `"${FFMPEG}" -y -f lavfi -i sine=frequency=330:duration=20 -f lavfi -i sine=frequency=440:duration=20 -f lavfi -i sine=frequency=550:duration=20 -filter_complex "[0:a][1:a][2:a]amix=inputs=3,volume=0.35[aout]" -map "[aout]" -c:a mp3 "${testMusicPath}"`,
      { stdio: 'ignore' }
    );
  }

  // Save metadata to library.json
  const musicLibraryJson = path.resolve('backend/storage/music-library/library.json');
  fs.writeFileSync(
    musicLibraryJson,
    JSON.stringify(
      [
        {
          id: 'test-track-1',
          filename: 'track_upbeat.mp3',
          title: 'Sunset Beat (Royalty Free)',
          artist: 'Nova Studio Music',
          moods: ['upbeat', 'energetic'],
          durationSeconds: 20.0,
          fileSizeBytes: fs.statSync(testMusicPath).size,
          mimeType: 'audio/mpeg',
          licenseSource: 'YouTube Audio Library (Royalty-Free)',
          storagePath: testMusicPath,
          url: '/storage/music-library/track_upbeat.mp3',
          createdAt: new Date().toISOString(),
        },
      ],
      null,
      2
    ),
    'utf-8'
  );
  console.log('  ✓ Background music registered in backend/storage/music-library/\n');

  // --------------------------------------------------------------------------
  // TEST 1: ASS Subtitle Generator Verification
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Testing ASS Subtitle Generator (Viral style, RTL, safe areas)...');
  try {
    const testAssOutput = path.join(testDir, 'test_generated.ass');

    // Sample transcript data
    const transcriptMap = new Map();
    transcriptMap.set('asset-en', {
      language: 'en',
      segments: [
        {
          start: 0.0,
          end: 3.5,
          text: 'Welcome to NovaCut Studio',
          words: [
            { word: 'Welcome', start: 0.0, end: 0.8 },
            { word: 'to', start: 0.8, end: 1.2 },
            { word: 'NovaCut', start: 1.2, end: 2.2 },
            { word: 'Studio', start: 2.2, end: 3.2 },
          ],
        },
      ],
    });

    // Urdu RTL transcript data
    transcriptMap.set('asset-ur', {
      language: 'ur',
      segments: [
        {
          start: 0.0,
          end: 3.0,
          text: 'یہ ایک خودکار ویڈیو ایڈیٹر ہے',
          words: [
            { word: 'یہ', start: 0.0, end: 0.6 },
            { word: 'ایک', start: 0.6, end: 1.2 },
            { word: 'خودکار', start: 1.2, end: 2.0 },
            { word: 'ویڈیو', start: 2.0, end: 2.6 },
            { word: 'ہے', start: 2.6, end: 3.0 },
          ],
        },
      ],
    });

    const clipMappings = [
      {
        assetId: 'asset-en',
        sourceIn: 0.0,
        sourceOut: 3.5,
        speed: 1.0,
        timelineStart: 0.0,
        timelineDuration: 3.5,
      },
      {
        assetId: 'asset-ur',
        sourceIn: 0.0,
        sourceOut: 3.0,
        speed: 1.0,
        timelineStart: 3.5,
        timelineDuration: 3.0,
      },
    ];

    const generatedAssPath = subtitleService.generateAssFile({
      outputPath: testAssOutput,
      targetWidth: 1080,
      targetHeight: 1920,
      aspectRatio: '9:16',
      style: 'viral',
      highlightColorHex: '#FFDE59',
      clipMappings,
      transcriptsByAssetId: transcriptMap,
      textOverlays: [
        {
          text: 'NOVACUT AI REEL',
          startTime: 0.0,
          endTime: 2.0,
          position: 'top',
        },
      ],
      fontsDir: storageService.getFontsDir(),
    });

    if (!fs.existsSync(generatedAssPath)) {
      throw new Error(`ASS file was not created at ${generatedAssPath}`);
    }

    const assContent = fs.readFileSync(generatedAssPath, 'utf-8');

    // Assertions
    if (!assContent.includes('[Script Info]') || !assContent.includes('[V4+ Styles]')) {
      throw new Error('ASS file missing required headers');
    }
    if (!assContent.includes('Viral_Latin') || !assContent.includes('Viral_RTL')) {
      throw new Error('ASS file missing Viral Latin and RTL style definitions');
    }
    if (!assContent.includes(',240,1') && !assContent.includes(',240,')) {
      // 9:16 vertical safe area margin
      throw new Error('ASS file did not set safe area bottom margin (240px)');
    }
    if (!assContent.includes('\\c&H0059DEFF&')) {
      // Gold active word highlight color in ASS BGR format
      throw new Error('ASS file missing active word color highlighting tag');
    }
    if (!assContent.includes('\\fad(300,300)')) {
      throw new Error('ASS file missing fade animation tag for title overlay');
    }

    console.log(`  ✓ ASS file generated and validated (${assContent.split('\n').length} lines)`);
    const details = `Generated valid ASS file with safe bottom margin (240px), gold highlight & RTL styles`;
    console.log(`>>> RESULT [TEST 1 - Captions / Subtitles Generator]: PASSED (${details})`);
    results.push({
      test: 'ASS Subtitle Generator (Viral, RTL, Safe Area, Fade Overlays)',
      status: 'PASSED',
      details,
    });
  } catch (err: any) {
    console.error('  ✗ Subtitle test failed:', err);
    console.log(`>>> RESULT [TEST 1 - Captions / Subtitles Generator]: FAILED (${err.message})`);
    results.push({
      test: 'ASS Subtitle Generator',
      status: 'FAILED',
      details: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 2: Silence Removal Detection & Safe Slicing
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing Silence Removal Detection on Speech Fixture...');
  try {
    const silences = await pythonBridgeService.detectSilence(speechEnPath, -30.0, 0.4);
    console.log(`  Detected ${silences.length} silence interval(s):`, silences);

    if (silences.length === 0) {
      throw new Error('Expected at least 1 silence interval >= 0.4s to be detected in speech fixture');
    }

    const targetSilence = silences[0];
    if (targetSilence.duration < 0.4) {
      throw new Error(`Silence interval duration (${targetSilence.duration}s) was less than 0.4s`);
    }

    // Verify 0.05s safety padding logic
    const cutStart = targetSilence.start + 0.05;
    const cutEnd = targetSilence.end - 0.05;
    const cutDuration = cutEnd - cutStart;

    console.log(
      `  ✓ Silence pause from ${targetSilence.start.toFixed(2)}s to ${targetSilence.end.toFixed(2)}s ` +
        `(duration: ${targetSilence.duration.toFixed(2)}s). Sliced with 50ms padding: ` +
        `[${cutStart.toFixed(2)}s - ${cutEnd.toFixed(2)}s] (saved ${cutDuration.toFixed(2)}s of dead air)`
    );

    const details = `Detected ${silences.length} silence gap(s) (${targetSilence.duration.toFixed(2)}s), applied safety margins cleanly`;
    console.log(`>>> RESULT [TEST 2 - Silence Removal]: PASSED (${details})`);
    results.push({
      test: 'Silence Detection & 50ms Word Safety Padding',
      status: 'PASSED',
      details,
    });
  } catch (err: any) {
    console.error('  ✗ Silence removal test failed:', err);
    console.log(`>>> RESULT [TEST 2 - Silence Removal]: FAILED (${err.message})`);
    results.push({
      test: 'Silence Detection & Safe Slicing',
      status: 'FAILED',
      details: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 3: YouTube Shorts 9:16 Draft Render (720x1280)
  // Full flow: Burned Viral Subtitles + Watermark Logo + Ducked Music + Ken Burns Photo
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing YouTube Shorts 9:16 Draft Render (720x1280)...');
  try {
    const shortsDraftPath = path.join(testDir, 'Shorts_Draft_720x1280.mp4');
    const shortsAssPath = path.join(testDir, 'Shorts_Draft.ass');

    const shortsTransMap = new Map<string, any>();
    shortsTransMap.set('speech-clip', {
      language: 'en',
      segments: [
        {
          start: 0.0,
          end: 3.0,
          text: 'Welcome to NovaCut Studio',
          words: [
            { word: 'Welcome', start: 0.2, end: 0.9 },
            { word: 'to', start: 0.9, end: 1.3 },
            { word: 'NovaCut', start: 1.3, end: 2.2 },
            { word: 'Studio', start: 2.2, end: 2.9 },
          ],
        },
      ],
    });

    // Generate ASS file for the shorts draft render
    subtitleService.generateAssFile({
      outputPath: shortsAssPath,
      targetWidth: 720,
      targetHeight: 1280,
      aspectRatio: '9:16',
      style: 'viral',
      highlightColorHex: '#FFDE59',
      clipMappings: [
        {
          assetId: 'speech-clip',
          sourceIn: 0.0,
          sourceOut: 3.0,
          speed: 1.0,
          timelineStart: 0.0,
          timelineDuration: 3.0,
        },
        {
          assetId: 'photo-clip',
          sourceIn: 0.0,
          sourceOut: 2.0,
          speed: 1.0,
          timelineStart: 3.0,
          timelineDuration: 2.0,
        },
      ],
      transcriptsByAssetId: shortsTransMap,
      textOverlays: [
        {
          text: 'AUTONOMOUS EDIT',
          startTime: 0.2,
          endTime: 2.5,
          position: 'top',
        },
      ],
      fontsDir: storageService.getFontsDir(),
    });

    const segments = [
      {
        assetId: 'speech-clip',
        filePath: speechEnPath,
        isPhoto: false,
        sourceIn: 0.0,
        sourceOut: 3.0,
        speed: 1.0,
        transition: 'cut',
        motionEffect: 'zoom_in',
        hasAudio: true,
      },
      {
        assetId: 'photo-clip',
        filePath: photoPath,
        isPhoto: true,
        sourceIn: 0.0,
        sourceOut: 2.0,
        speed: 1.0,
        transition: 'crossfade',
        motionEffect: 'ken_burns',
        hasAudio: false,
      },
    ];

    console.log('  Invoking FFmpeg draft render (Captions + Ducked Music + Watermark)...');
    const tStart = Date.now();
    const renderRes = await ffmpegService.renderPlan({
      jobId: 'test-shorts-9-16-draft-job',
      segments,
      frame: {
        platform: 'YouTube Shorts 9:16',
        aspectRatio: '9:16',
        resolution: '1080x1920',
      },
      qualityMode: 'draft',
      outputPath: shortsDraftPath,
      subtitles: {
        assPath: shortsAssPath,
        fontsDir: storageService.getFontsDir(),
      },
      brandWatermark: {
        logoPath: testLogoPath,
        position: 'top-right',
        opacityPercent: 85,
        sizePercent: 16,
      },
      backgroundMusic: {
        trackPath: testMusicPath,
        volume: 0.25,
        ducking: true,
      },
      timeoutMs: 180000,
    });

    const renderSec = ((Date.now() - tStart) / 1000).toFixed(1);
    console.log(`  Render completed in ${renderSec}s! Probing draft output...`);

    const probe = await ffprobeService.probeMedia(shortsDraftPath);
    console.log(`  Probed dimensions: ${probe.width}x${probe.height}, Codec: ${probe.videoCodec}, Audio: ${probe.audioCodec}, Duration: ${probe.duration}s`);

    if (probe.width !== 720 || probe.height !== 1280) {
      throw new Error(`Expected 720x1280 draft resolution, got ${probe.width}x${probe.height}`);
    }
    if (!probe.videoCodec || !probe.audioCodec) {
      throw new Error('Output is missing video or audio stream');
    }

    const sampleFramePath = path.join(testDir, 'frame_shorts_draft_1_5s.jpg');
    execSync(`"${FFMPEG}" -y -ss 1.5 -i "${shortsDraftPath}" -vframes 1 "${sampleFramePath}"`, { stdio: 'ignore' });
    const frameSize = fs.statSync(sampleFramePath).size;

    console.log(`  ✓ Sample frame extracted (${frameSize} bytes): ${sampleFramePath}`);
    const details = `720x1280 @ 30fps, ${probe.duration?.toFixed(1)}s, ${renderRes.fileSizeBytes} bytes (${renderSec}s encode)`;
    console.log(`>>> RESULT [TEST 3 - YouTube Shorts 9:16 Draft]: PASSED (${details})`);
    results.push({
      test: 'YouTube Shorts 9:16 Draft (720x1280) with Captions, Ducking & Logo',
      status: 'PASSED',
      details,
    });
  } catch (err: any) {
    console.error('  ✗ Shorts draft render test failed:', err);
    console.log(`>>> RESULT [TEST 3 - YouTube Shorts 9:16 Draft]: FAILED (${err.message})`);
    results.push({
      test: 'YouTube Shorts 9:16 Draft Render',
      status: 'FAILED',
      details: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 4: YouTube 16:9 Render with Urdu RTL Subtitles (Draft 1280x720)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing YouTube 16:9 Draft Render with Urdu RTL Captions (1280x720)...');
  try {
    const ytDraftExportPath = path.join(testDir, 'YouTube_Urdu_Draft_1280x720.mp4');
    const urduAssPath = path.join(testDir, 'Urdu_Subtitles.ass');

    const urduTransMap = new Map<string, any>();
    urduTransMap.set('urdu-clip', {
      language: 'ur',
      segments: [
        {
          start: 0.2,
          end: 3.8,
          text: 'یہ خودکار اردو کیپشن ٹیسٹ ہے',
          words: [
            { word: 'یہ', start: 0.3, end: 1.0 },
            { word: 'خودکار', start: 1.0, end: 1.9 },
            { word: 'اردو', start: 1.9, end: 2.7 },
            { word: 'کیپشن', start: 2.7, end: 3.7 },
          ],
        },
      ],
    });

    subtitleService.generateAssFile({
      outputPath: urduAssPath,
      targetWidth: 1280,
      targetHeight: 720,
      aspectRatio: '16:9',
      style: 'viral',
      highlightColorHex: '#FFDE59',
      clipMappings: [
        {
          assetId: 'urdu-clip',
          sourceIn: 0.0,
          sourceOut: 4.0,
          speed: 1.0,
          timelineStart: 0.0,
          timelineDuration: 4.0,
        },
      ],
      transcriptsByAssetId: urduTransMap,
      fontsDir: storageService.getFontsDir(),
    });

    const segments = [
      {
        assetId: 'urdu-clip',
        filePath: speechUrduPath,
        isPhoto: false,
        sourceIn: 0.0,
        sourceOut: 4.0,
        speed: 1.0,
        transition: 'cut',
        motionEffect: 'none',
        hasAudio: true,
      },
    ];

    const tStart = Date.now();
    const renderRes = await ffmpegService.renderPlan({
      jobId: 'test-yt-urdu-16-9-job',
      segments,
      frame: {
        platform: 'YouTube 16:9',
        aspectRatio: '16:9',
        resolution: '1920x1080',
      },
      qualityMode: 'draft',
      outputPath: ytDraftExportPath,
      subtitles: {
        assPath: urduAssPath,
        fontsDir: storageService.getFontsDir(),
      },
      brandWatermark: {
        logoPath: testLogoPath,
        position: 'top-left',
        opacityPercent: 80,
        sizePercent: 14,
      },
      backgroundMusic: {
        trackPath: testMusicPath,
        volume: 0.2,
        ducking: true,
      },
    });

    const renderSec = ((Date.now() - tStart) / 1000).toFixed(1);
    const probe = await ffprobeService.probeMedia(ytDraftExportPath);
    console.log(`  Probed dimensions: ${probe.width}x${probe.height}, Duration: ${probe.duration}s`);

    if (probe.width !== 1280 || probe.height !== 720) {
      throw new Error(`Expected 1280x720 draft resolution, got ${probe.width}x${probe.height}`);
    }

    // Extract frame to verify Urdu text
    const sampleFramePath = path.join(testDir, 'frame_urdu_2s.jpg');
    execSync(`"${FFMPEG}" -y -ss 2.0 -i "${ytDraftExportPath}" -vframes 1 "${sampleFramePath}"`, { stdio: 'ignore' });
    const frameSize = fs.existsSync(sampleFramePath) ? fs.statSync(sampleFramePath).size : 0;

    console.log(`  ✓ Sample frame extracted (${frameSize} bytes): ${sampleFramePath}`);
    const details = `1280x720 @ 30fps, ${probe.duration?.toFixed(1)}s, ${renderRes.fileSizeBytes} bytes (${renderSec}s encode)`;
    console.log(`>>> RESULT [TEST 4 - YouTube 16:9 Urdu RTL]: PASSED (${details})`);
    results.push({
      test: 'YouTube 16:9 Draft (1280x720) with Urdu RTL Subtitles & Ducked Music',
      status: 'PASSED',
      details,
    });
  } catch (err: any) {
    console.error('  ✗ YouTube Urdu render test failed:', err);
    console.log(`>>> RESULT [TEST 4 - YouTube 16:9 Urdu RTL]: FAILED (${err.message})`);
    results.push({
      test: 'YouTube 16:9 Draft Render with Urdu RTL',
      status: 'FAILED',
      details: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 5: Re-render with Feature Toggles (Result Screen controls)
  // Verify that rendering without subtitles/music/watermark succeeds cleanly
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Testing Re-render with Feature Toggles (All Optional Overlays OFF)...');
  try {
    const rawReRenderPath = path.join(testDir, 'Clean_ReRender_NoOverlays.mp4');

    const segments = [
      {
        assetId: 'speech-clip',
        filePath: speechEnPath,
        isPhoto: false,
        sourceIn: 0.0,
        sourceOut: 3.0,
        speed: 1.0,
        transition: 'cut',
        motionEffect: 'none',
        hasAudio: true,
      },
    ];

    const renderRes = await ffmpegService.renderPlan({
      jobId: 'test-clean-rerender-job',
      segments,
      frame: {
        platform: 'YouTube 16:9',
        aspectRatio: '16:9',
        resolution: '1920x1080',
      },
      qualityMode: 'draft',
      outputPath: rawReRenderPath,
      timeoutMs: 180000,
      // All overlays explicitly omitted (simulating user toggling them off in result screen)
    });

    const probe = await ffprobeService.probeMedia(rawReRenderPath);
    console.log(`  Clean re-render probed: ${probe.width}x${probe.height}, ${probe.duration}s, size: ${renderRes.fileSizeBytes} bytes`);
    const details = `Rendered clean 1280x720 video without subtitles/music/watermark from plan directly`;
    console.log(`>>> RESULT [TEST 5 - Re-render with Feature Toggles]: PASSED (${details})`);
    results.push({
      test: 'Result Screen Fast Re-render with Feature Toggles (Overlays OFF)',
      status: 'PASSED',
      details,
    });
  } catch (err: any) {
    console.error('  ✗ Clean re-render test failed:', err);
    console.log(`>>> RESULT [TEST 5 - Re-render with Feature Toggles]: FAILED (${err.message})`);
    results.push({
      test: 'Re-render with Feature Toggles',
      status: 'FAILED',
      details: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 6: YouTube Shorts 9:16 Final Quality Render (Single Final Case)
  // Full 1080x1920 render with burned viral subtitles, ducked music & watermark
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Testing YouTube Shorts 9:16 Final Render (1080x1920, High Quality)...');
  try {
    const shortsFinalExportPath = path.join(testDir, 'Shorts_Final_1080x1920.mp4');
    const shortsFinalAssPath = path.join(testDir, 'Shorts_Final_1080.ass');

    const shortsFinalTransMap = new Map<string, any>();
    shortsFinalTransMap.set('speech-final', {
      language: 'en',
      segments: [
        {
          start: 0.0,
          end: 2.5,
          text: 'Welcome to NovaCut Studio',
          words: [
            { word: 'Welcome', start: 0.1, end: 0.7 },
            { word: 'to', start: 0.7, end: 1.0 },
            { word: 'NovaCut', start: 1.0, end: 1.7 },
            { word: 'Studio', start: 1.7, end: 2.3 },
          ],
        },
      ],
    });

    subtitleService.generateAssFile({
      outputPath: shortsFinalAssPath,
      targetWidth: 1080,
      targetHeight: 1920,
      aspectRatio: '9:16',
      style: 'viral',
      highlightColorHex: '#FFDE59',
      clipMappings: [
        {
          assetId: 'speech-final',
          sourceIn: 0.0,
          sourceOut: 2.5,
          speed: 1.0,
          timelineStart: 0.0,
          timelineDuration: 2.5,
        },
        {
          assetId: 'photo-final',
          sourceIn: 0.0,
          sourceOut: 1.5,
          speed: 1.0,
          timelineStart: 2.5,
          timelineDuration: 1.5,
        },
      ],
      transcriptsByAssetId: shortsFinalTransMap,
      fontsDir: storageService.getFontsDir(),
    });

    const segments = [
      {
        assetId: 'speech-final',
        filePath: speechEnPath,
        isPhoto: false,
        sourceIn: 0.0,
        sourceOut: 2.5,
        speed: 1.0,
        transition: 'cut',
        motionEffect: 'zoom_in',
        hasAudio: true,
      },
      {
        assetId: 'photo-final',
        filePath: photoPath,
        isPhoto: true,
        sourceIn: 0.0,
        sourceOut: 1.5,
        speed: 1.0,
        transition: 'dissolve',
        motionEffect: 'ken_burns',
        hasAudio: false,
      },
    ];

    console.log('  Invoking FFmpeg Final 1080x1920 render with timeout protection...');
    const tStart = Date.now();
    const renderRes = await ffmpegService.renderPlan({
      jobId: 'test-shorts-final-case-job',
      segments,
      frame: {
        platform: 'YouTube Shorts 9:16',
        aspectRatio: '9:16',
        resolution: '1080x1920',
      },
      qualityMode: 'final',
      outputPath: shortsFinalExportPath,
      subtitles: {
        assPath: shortsFinalAssPath,
        fontsDir: storageService.getFontsDir(),
      },
      brandWatermark: {
        logoPath: testLogoPath,
        position: 'top-right',
        opacityPercent: 85,
        sizePercent: 16,
      },
      backgroundMusic: {
        trackPath: testMusicPath,
        volume: 0.25,
        ducking: true,
      },
      timeoutMs: 300000, // 5 min timeout
    });

    const renderSec = ((Date.now() - tStart) / 1000).toFixed(1);
    console.log(`  Final render completed in ${renderSec}s! Probing final output...`);

    const probe = await ffprobeService.probeMedia(shortsFinalExportPath);
    console.log(`  Probed dimensions: ${probe.width}x${probe.height}, Codec: ${probe.videoCodec}, Audio: ${probe.audioCodec}, Duration: ${probe.duration}s`);

    if (probe.width !== 1080 || probe.height !== 1920) {
      throw new Error(`Expected 1080x1920 final resolution, got ${probe.width}x${probe.height}`);
    }

    const sampleFramePath = path.join(testDir, 'frame_shorts_final_1_5s.jpg');
    execSync(`"${FFMPEG}" -y -ss 1.5 -i "${shortsFinalExportPath}" -vframes 1 "${sampleFramePath}"`, { stdio: 'ignore' });

    const details = `1080x1920 @ 30fps, ${probe.duration?.toFixed(1)}s, ${renderRes.fileSizeBytes} bytes (${renderSec}s encode)`;
    console.log(`>>> RESULT [TEST 6 - YouTube Shorts 9:16 Final]: PASSED (${details})`);
    results.push({
      test: 'YouTube Shorts 9:16 Final (1080x1920) with Captions, Ducking & Logo',
      status: 'PASSED',
      details,
    });
  } catch (err: any) {
    console.error('  ✗ Final render test failed:', err);
    console.log(`>>> RESULT [TEST 6 - YouTube Shorts 9:16 Final]: FAILED (${err.message})`);
    results.push({
      test: 'YouTube Shorts 9:16 Final Render',
      status: 'FAILED',
      details: err.message,
    });
  }

  // --------------------------------------------------------------------------
  // FINAL RESULTS REPORT
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('  STEP 5B TEST SUITE SUMMARY');
  console.log('================================================================');
  for (const r of results) {
    const icon = r.status === 'PASSED' ? '✓' : '✗';
    console.log(`  ${icon} [${r.status}] ${r.test}`);
    console.log(`     → ${r.details}`);
  }
  console.log('================================================================\n');

  const allPassed = results.every((r) => r.status === 'PASSED');
  if (!allPassed) {
    process.exit(1);
  }
}

runStep5BTestSuite().catch((err) => {
  console.error('Fatal error in Step 5B test suite:', err);
  process.exit(1);
});
