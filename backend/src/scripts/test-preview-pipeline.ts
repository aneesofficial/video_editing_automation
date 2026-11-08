import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { ffmpegService } from '../services/ffmpeg/ffmpeg.service.js';
import { ffprobeService } from '../services/ffmpeg/ffprobe.service.js';
import { pythonBridgeService } from '../services/python/python-bridge.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  name: string;
  inputFile: string;
  inputDetails: string;
  previewFile: string;
  videoCodec: string;
  audioCodec: string;
  pixFmt: string;
  resolution: string;
  fps: string;
  hasAudio: boolean;
  status: 'PASS' | 'FAIL';
  notes: string;
}

async function runSuite() {
  console.log('================================================================');
  console.log('   STARTING UNIVERSAL PREVIEW GENERATION TEST SUITE');
  console.log('================================================================\n');

  const testDir = path.resolve(__dirname, '../../storage/temp/preview_test_suite');
  const outDir = path.join(testDir, 'previews');
  fs.mkdirSync(testDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const results: TestResult[] = [];

  // Helper to run ffmpeg generation of test inputs
  const createTestFile = (filename: string, ffmpegCmd: string) => {
    const fullPath = path.join(testDir, filename);
    if (!fs.existsSync(fullPath)) {
      console.log(`Generating input fixture: ${filename}...`);
      execSync(`ffmpeg -y ${ffmpegCmd} "${fullPath}"`, { stdio: 'pipe' });
    }
    return fullPath;
  };

  // 1. H.265 / HEVC Video
  const h265Path = createTestFile(
    'test_h265.mp4',
    '-f lavfi -i testsrc=duration=2:size=1920x1080:rate=60 -f lavfi -i sine=frequency=440:duration=2 -c:v libx265 -crf 28 -pix_fmt yuv420p -c:a aac -tag:v hvc1'
  );

  // 2. Rotated Video (Rotation 90)
  const rotatedPath = createTestFile(
    'test_rotated_90.mp4',
    '-f lavfi -i testsrc=duration=2:size=1280x720:rate=30 -f lavfi -i sine=frequency=500:duration=2 -c:v libx264 -c:a aac -metadata:s:v:0 rotate=90'
  );

  // 3. HDR-like Video (BT.2020 / SMPTE 2084 PQ)
  const hdrPath = createTestFile(
    'test_hdr.mp4',
    '-f lavfi -i testsrc=duration=2:size=1920x1080:rate=30 -f lavfi -i sine=frequency=600:duration=2 -c:v libx265 -pix_fmt yuv420p10le -color_primaries bt2020 -color_trc smpte2084 -colorspace bt2020nc -c:a aac'
  );

  // 4. Variable Frame Rate Video
  const vfrPath = createTestFile(
    'test_vfr.mp4',
    '-f lavfi -i testsrc=duration=2:size=1280x720:rate=30 -f lavfi -i sine=frequency=700:duration=2 -vf mpdecimate -fps_mode vfr -c:v libx264 -c:a aac'
  );

  // 5. Video Without Audio
  const noAudioPath = createTestFile(
    'test_no_audio.mp4',
    '-f lavfi -i testsrc=duration=2:size=1280x720:rate=30 -c:v libx264 -an'
  );

  // 6. .mov Container File
  const movPath = createTestFile(
    'test_quicktime.mov',
    '-f lavfi -i testsrc=duration=2:size=1920x1080:rate=24 -f lavfi -i sine=frequency=800:duration=2 -c:v libx264 -c:a aac'
  );

  // 7. Photo
  const photoPath = createTestFile(
    'test_photo.jpg',
    '-f lavfi -i color=c=blue:s=1600x1200:d=1 -frames:v 1'
  );

  // 8. User Existing Video in backend storage
  const userUploadPath = path.resolve(
    __dirname,
    '../../storage/clients/Ali Store/Digital Marketing/raw/824b0a4e-03f0-462f-9a7c-72f3d0d35ce2.mov'
  );

  const testCases = [
    { name: '1. H.265 / HEVC Video', path: h265Path, type: 'video' },
    { name: '2. Rotated Video (90°)', path: rotatedPath, type: 'video' },
    { name: '3. HDR (BT.2020/PQ)', path: hdrPath, type: 'video' },
    { name: '4. Variable Frame Rate', path: vfrPath, type: 'video' },
    { name: '5. Video Without Audio', path: noAudioPath, type: 'video' },
    { name: '6. QuickTime .MOV File', path: movPath, type: 'video' },
    { name: '7. Photo (.jpg)', path: photoPath, type: 'photo' },
    { name: '8. User Uploaded iPhone Video', path: userUploadPath, type: 'video' },
  ];

  for (const tc of testCases) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`Testing: ${tc.name}`);
    console.log(`Input:   ${tc.path}`);

    if (!fs.existsSync(tc.path)) {
      console.warn(`File does not exist: ${tc.path}`);
      continue;
    }

    const inputProbe = tc.type === 'video' ? await ffprobeService.probeMedia(tc.path) : null;
    const inputSummary = inputProbe
      ? `${inputProbe.videoCodec} | ${inputProbe.width}x${inputProbe.height} | rot:${inputProbe.rotation || 0}° | hdr:${!!inputProbe.isHdr} | audio:${inputProbe.audioCodec || 'none'}`
      : 'Photo (Image)';

    console.log(`Input characteristics: ${inputSummary}`);

    const baseName = path.basename(tc.path, path.extname(tc.path));
    const previewOut = path.join(outDir, `${baseName}_preview.${tc.type === 'photo' ? 'jpg' : 'mp4'}`);

    const startTime = Date.now();
    try {
      if (tc.type === 'video') {
        await ffmpegService.generatePreview(tc.path, previewOut, inputProbe || undefined);
      } else {
        await pythonBridgeService.generatePhotoPreview(tc.path, previewOut);
      }
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`Preview generated in ${elapsed}s -> ${previewOut}`);

      // Verify output with ffprobe
      const outputProbe = tc.type === 'video' ? await ffprobeService.probeMedia(previewOut) : null;
      const isVideo = tc.type === 'video';

      const vCodecPass = isVideo ? outputProbe?.videoCodec === 'h264' : true;
      const aCodecPass = isVideo ? !!outputProbe?.audioCodec && outputProbe.audioCodec === 'aac' : true;
      const pixFmtPass = isVideo ? outputProbe?.pixFmt === 'yuv420p' : true;
      const resPass = isVideo && outputProbe
        ? outputProbe.width <= 1280 &&
          outputProbe.height <= 1280 &&
          outputProbe.width % 2 === 0 &&
          outputProbe.height % 2 === 0
        : true;
      const fpsPass = isVideo && outputProbe ? Math.round(outputProbe.frameRate) === 30 : true;

      const passed = isVideo ? (vCodecPass && aCodecPass && pixFmtPass && resPass && fpsPass) : fs.existsSync(previewOut);

      results.push({
        name: tc.name,
        inputFile: path.basename(tc.path),
        inputDetails: inputSummary,
        previewFile: path.basename(previewOut),
        videoCodec: outputProbe?.videoCodec || (tc.type === 'photo' ? 'mjpeg/jpg' : 'n/a'),
        audioCodec: outputProbe?.audioCodec || (tc.type === 'photo' ? 'n/a' : 'none'),
        pixFmt: outputProbe?.pixFmt || 'n/a',
        resolution: outputProbe ? `${outputProbe.width}x${outputProbe.height}` : 'Photo',
        fps: outputProbe ? `${Math.round(outputProbe.frameRate)} fps` : 'n/a',
        hasAudio: !!outputProbe?.audioCodec,
        status: passed ? 'PASS' : 'FAIL',
        notes: `Generated in ${elapsed}s. Browser-safe: ${outputProbe?.isBrowserSafe ?? true}`,
      });

      console.log(
        `Verification: [${passed ? 'PASS' : 'FAIL'}] Codec: ${outputProbe?.videoCodec || 'image'}, Audio: ${outputProbe?.audioCodec || 'none'}, Res: ${outputProbe ? `${outputProbe.width}x${outputProbe.height}` : 'photo'}, FPS: ${outputProbe?.frameRate || 'n/a'}, Browser-safe: ${outputProbe?.isBrowserSafe ?? true}`
      );
    } catch (err: any) {
      console.error(`Preview failed for ${tc.name}:`, err.message);
      results.push({
        name: tc.name,
        inputFile: path.basename(tc.path),
        inputDetails: inputSummary,
        previewFile: path.basename(previewOut),
        videoCodec: 'err',
        audioCodec: 'err',
        pixFmt: 'err',
        resolution: 'err',
        fps: 'err',
        hasAudio: false,
        status: 'FAIL',
        notes: err.message,
      });
    }
  }

  console.log('\n================================================================');
  console.log('                      TEST RESULTS SUMMARY');
  console.log('================================================================');
  console.table(
    results.map((r) => ({
      Test: r.name,
      Input: r.inputFile,
      OutputCodec: r.videoCodec,
      AudioCodec: r.audioCodec,
      Resolution: r.resolution,
      FPS: r.fps,
      Status: r.status,
    }))
  );

  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`\nOVERALL SUITE RESULT: ${allPassed ? 'ALL TESTS PASSED (100%)' : 'SOME TESTS FAILED'}\n`);
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

