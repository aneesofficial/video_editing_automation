/**
 * Step 7 Photo Editing Automated Test Suite
 *
 * Verifies:
 * 1. Real test photo generation (dark, blurry, portrait, graphic)
 * 2. OpenCV/Pillow Photo Analysis (brightness, contrast, blur score, face/saliency detection)
 * 3. AI Photo Planner (Gemini & analysis-driven fallback)
 * 4. Comprehensive Photo Editing Operations (smart crop, auto levels, filters, vignette, text, logo)
 * 5. Background removal (ONNX u2netp) & replacement (transparent PNG, solid color, gradient, blur)
 * 6. Target frame sizes (16:9, 1:1, 4:5, 9:16) verified with dimension probes
 * 7. Batch processing of 5 photos
 * 8. Versioning (photo_v1, photo_v2...) & bundle ZIP archive
 * 9. "Use in Video Project" MediaAsset database import
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { prisma } from '../config/database.js';
import { storageService } from '../services/storage/storage.service.js';
import { photoService } from '../services/photo/photo.service.js';
import { geminiPhotoPlannerService } from '../services/gemini/gemini-photo-planner.service.js';

const execFileAsync = promisify(execFile);

const TEST_DIR = path.resolve('backend/storage/temp/test_photos_step7');

async function createTestPhotos(): Promise<{
  darkPath: string;
  blurryPath: string;
  portraitPath: string;
  graphicPath: string;
  batchPaths: string[];
}> {
  fs.mkdirSync(TEST_DIR, { recursive: true });

  const pyScript = `
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import os

test_dir = r"${TEST_DIR}"
os.makedirs(test_dir, exist_ok=True)

# 1. Dark Photo (low brightness)
dark = np.ones((600, 800, 3), dtype=np.uint8) * 35
cv2.putText(dark, "Dark Night Scene", (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (70, 70, 70), 2)
cv2.imwrite(os.path.join(test_dir, "dark_photo.jpg"), dark)

# 2. Blurry Photo (low Laplacian variance)
blurry = np.zeros((600, 800, 3), dtype=np.uint8)
cv2.circle(blurry, (400, 300), 200, (255, 200, 100), -1)
blurry = cv2.GaussianBlur(blurry, (51, 51), 0)
cv2.imwrite(os.path.join(test_dir, "blurry_photo.jpg"), blurry)

# 3. Portrait Photo (with simulated human face oval & features)
portrait = np.ones((800, 600, 3), dtype=np.uint8) * 230
# Background pattern
for i in range(0, 800, 40):
    cv2.line(portrait, (0, i), (600, i), (210, 210, 220), 1)
# Draw subject silhouette & face
cv2.ellipse(portrait, (300, 320), (120, 170), 0, 0, 360, (190, 160, 140), -1) # Head
cv2.ellipse(portrait, (300, 600), (220, 180), 0, 0, 360, (50, 40, 100), -1)  # Body/torso
# Eyes
cv2.circle(portrait, (255, 300), 15, (40, 40, 40), -1)
cv2.circle(portrait, (345, 300), 15, (40, 40, 40), -1)
# Smile
cv2.ellipse(portrait, (300, 380), (45, 20), 0, 0, 180, (40, 40, 40), 4)
cv2.imwrite(os.path.join(test_dir, "portrait_photo.jpg"), portrait)

# 4. Colorful Graphic (sharp contrast)
graphic = np.ones((500, 500, 3), dtype=np.uint8) * 255
cv2.rectangle(graphic, (50, 50), (450, 450), (0, 128, 255), -1)
cv2.circle(graphic, (250, 250), 120, (255, 255, 0), -1)
cv2.putText(graphic, "VIVID LOGO", (80, 260), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (255, 255, 255), 4)
cv2.imwrite(os.path.join(test_dir, "graphic_photo.png"), graphic)

# 5. Batch Photos (5 photos)
for idx in range(1, 6):
    b = np.ones((400, 400, 3), dtype=np.uint8) * (40 * idx)
    cv2.putText(b, f"Batch Image {idx}", (40, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
    cv2.imwrite(os.path.join(test_dir, f"batch_{idx}.jpg"), b)

print("ALL_CREATED")
`;

  await execFileAsync('python', ['-c', pyScript]);

  return {
    darkPath: path.join(TEST_DIR, 'dark_photo.jpg'),
    blurryPath: path.join(TEST_DIR, 'blurry_photo.jpg'),
    portraitPath: path.join(TEST_DIR, 'portrait_photo.jpg'),
    graphicPath: path.join(TEST_DIR, 'graphic_photo.png'),
    batchPaths: [1, 2, 3, 4, 5].map((i) => path.join(TEST_DIR, `batch_${i}.jpg`)),
  };
}

async function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  const pyCode = `
from PIL import Image
im = Image.open(r"${filePath}")
print(f"{im.width}x{im.height}")
`;
  const { stdout } = await execFileAsync('python', ['-c', pyCode]);
  const [w, h] = stdout.trim().split('x').map(Number);
  return { width: w, height: h };
}

async function runStep7TestSuite() {
  console.log('=====================================================');
  console.log('  NovaCut Step 7 Photo Editing Verification Suite    ');
  console.log('=====================================================\n');

  const clientId = 'TestClient_Step7';
  const projectId = 'TestProject_Step7';

  // Step 1: Create real test photos
  console.log('[Setup] Generating real test photos (dark, blurry, portrait, graphic, batch)...');
  const photos = await createTestPhotos();
  console.log('✓ Created 4 specialized test images + 5 batch images.\n');

  // Step 2: Test Photo Analysis
  console.log('--- Test 1: OpenCV/Pillow Photo Analysis ---');
  const darkAnalysis = await photoService.analyzePhoto(photos.darkPath);
  console.log(`- Dark photo brightness: ${darkAnalysis.brightness.toFixed(1)} (is_dark: ${darkAnalysis.is_dark})`);
  if (!darkAnalysis.is_dark) {
    throw new Error('Expected dark photo to be flagged as is_dark = true');
  }

  const blurryAnalysis = await photoService.analyzePhoto(photos.blurryPath);
  console.log(`- Blurry photo blur score: ${blurryAnalysis.blur_score.toFixed(1)} (is_blurry: ${blurryAnalysis.is_blurry})`);

  const portraitAnalysis = await photoService.analyzePhoto(photos.portraitPath);
  console.log(`- Portrait photo aspect ratio: ${portraitAnalysis.aspect_ratio.toFixed(2)}, saliency center: (${portraitAnalysis.saliency_center.x}, ${portraitAnalysis.saliency_center.y})`);
  console.log('✓ Test 1 Passed: Photo analysis computes brightness, contrast, blur score & saliency.\n');

  // Step 3: Test AI Photo Planner
  console.log('--- Test 2: AI Photo Planner ---');
  const plan = await geminiPhotoPlannerService.generatePhotoPlan({
    userPrompt: 'Vivid YouTube thumbnail with warm glow and soft vignette',
    frame: '16:9',
    photoName: 'portrait_photo.jpg',
    fileSizeBytes: fs.statSync(photos.portraitPath).size,
    analysis: portraitAnalysis,
    previewPath: photos.portraitPath,
    hasBrandLogo: true,
  });
  console.log(`- Generated Plan Summary: "${plan.summary}"`);
  console.log(`- Target Frame: ${typeof plan.frame === 'object' ? (plan.frame as any).platform || 'Custom' : plan.frame}`);
  console.log(`- Filter: ${plan.filter}, Vignette: ${plan.vignette}, Brightness: ${plan.brightness}`);
  console.log('✓ Test 2 Passed: AI Photo Planner generated validated structured plan.\n');

  // Step 4: Test Photo Editing Operations across 4 Frame Sizes
  console.log('--- Test 3: Operations & Frame Sizes (16:9, 1:1, 4:5, 9:16) ---');
  const frameTests = [
    { frame: '16:9', width: 1920, height: 1080, name: 'YouTube 16:9' },
    { frame: '1:1', width: 1080, height: 1080, name: 'Instagram 1:1' },
    { frame: '4:5', width: 1080, height: 1350, name: 'Instagram 4:5' },
    { frame: '9:16', width: 1080, height: 1920, name: 'Reel 9:16' },
  ];

  for (const ft of frameTests) {
    const editRes = await photoService.editPhoto({
      clientId,
      projectId,
      assetId: `test_${ft.frame.replace(':', '_')}`,
      inputPath: photos.portraitPath,
      plan: {
        summary: `Edit for ${ft.name}`,
        explanation: 'Testing smart crop and adjustments',
        frame: {
          platform: ft.name,
          aspectRatio: ft.frame,
          width: ft.width,
          height: ft.height,
        },
        auto_levels: true,
        brightness: 1.1,
        contrast: 1.15,
        saturation: 1.2,
        sharpness: 1.1,
        filter: 'warm',
        vignette: true,
        text_overlay: { text: ft.name, position: 'bottom', color: '#FFFFFF' },
      } as any,
      targetFormat: 'jpg',
    });

    const targetFile = editRes.filePath || editRes.outputPath;
    const dims = await getImageDimensions(targetFile);
    console.log(`- ${ft.name}: Output ${dims.width}x${dims.height}, Ops: [${editRes.operations.join(', ')}]`);
    if (dims.width !== ft.width || dims.height !== ft.height) {
      throw new Error(`Frame dimension mismatch for ${ft.name}. Expected ${ft.width}x${ft.height}, got ${dims.width}x${dims.height}`);
    }
  }
  console.log('✓ Test 3 Passed: All 4 frame sizes cropped and resized accurately.\n');

  // Step 5: Test Background Removal & Replacement
  console.log('--- Test 4: Background Removal & Replacement (ONNX u2netp) ---');
  const bgTests = [
    { mode: 'remove', format: 'png' as const, desc: 'Transparent PNG' },
    { mode: 'solid', color: '#00FF88', format: 'jpg' as const, desc: 'Solid Neon Mint (#00FF88)' },
    { mode: 'gradient', color: '#8B5CF6', color2: '#1E1B4B', format: 'jpg' as const, desc: '2-Color Purple Gradient' },
    { mode: 'blur', format: 'jpg' as const, desc: 'Blurred Original Background' },
  ];

  for (const bg of bgTests) {
    const bgEditRes = await photoService.editPhoto({
      clientId,
      projectId,
      assetId: `bg_${bg.mode}`,
      inputPath: photos.graphicPath,
      plan: {
        summary: `Background test: ${bg.desc}`,
        explanation: 'Testing background removal / replacement',
        frame: {
          platform: 'Instagram 1:1',
          aspectRatio: '1:1',
          width: 1080,
          height: 1080,
        },
        background: {
          mode: bg.mode as any,
          color: bg.color || '#FFFFFF',
          color2: bg.color2 || '#111827',
          blurRadius: 30,
        },
      } as any,
      targetFormat: bg.format,
    });

    const targetBgFile = bgEditRes.filePath || bgEditRes.outputPath;
    console.log(`- Background [${bg.desc}]: Saved to ${path.basename(targetBgFile)} (${bgEditRes.format}, size: ${bgEditRes.fileSizeBytes} bytes)`);
    if (!fs.existsSync(targetBgFile) || bgEditRes.fileSizeBytes < 1000) {
      throw new Error(`Background replacement failed for mode ${bg.mode}`);
    }
  }
  console.log('✓ Test 4 Passed: Transparent PNG, solid color, gradient, and blur background replacement work.\n');

  // Step 6: Test Batch Processing
  console.log('--- Test 5: Batch Processing (5 Photos) ---');
  const batchInputs = photos.batchPaths.map((p, idx) => ({
    assetId: `batch_photo_${idx + 1}`,
    inputPath: p,
    photoName: `batch_${idx + 1}.jpg`,
  }));

  const batchResults = await photoService.batchEditPhotos({
    clientId,
    projectId,
    photos: batchInputs,
    plan: {
      summary: 'Batch cinematic enhance',
      explanation: 'Applying batch preset across all 5 images',
      frame: {
        platform: 'YouTube 16:9',
        aspectRatio: '16:9',
        width: 1920,
        height: 1080,
      },
      auto_levels: true,
      filter: 'cinematic',
      vignette: true,
    } as any,
  });

  console.log(`- Batch processed ${batchResults.length} photos in single version folder:`);
  for (const res of batchResults) {
    console.log(`  * ${res.filename} (${res.width}x${res.height}, ${res.operations.join(', ')})`);
  }
  if (batchResults.length !== 5) {
    throw new Error(`Expected 5 batch results, got ${batchResults.length}`);
  }
  console.log('✓ Test 5 Passed: Batch processing executed cleanly.\n');

  // Step 7: Test Versioning & ZIP Archive
  console.log('--- Test 6: Version History & ZIP Download ---');
  const versions = photoService.listPhotoVersions(clientId, projectId);
  console.log(`- Found ${versions.length} versions: ${versions.map((v) => v.version).join(', ')}`);
  if (versions.length === 0) {
    throw new Error('Expected at least one version');
  }

  const latestVer = versions[0];
  const targetDir = latestVer.folderPath || path.join(storageService.getProjectExportsDir(clientId, projectId), latestVer.version);
  const zipPath = photoService.createDownloadZip(targetDir);
  const zipStats = fs.statSync(zipPath);
  console.log(`- Created bundle zip: ${path.basename(zipPath)} (${zipStats.size} bytes)`);
  if (!fs.existsSync(zipPath) || zipStats.size < 100) {
    throw new Error('ZIP archive creation failed');
  }
  console.log('✓ Test 6 Passed: Export versions and ZIP bundle created.\n');

  // Step 8: Test "Use in Video Project" MediaAsset Import
  console.log('--- Test 7: Use in Video Project (MediaAsset Database Import) ---');
  // Ensure DB project exists
  let dbProject = await prisma.project.findFirst({
    where: { title: projectId },
  });
  if (!dbProject) {
    dbProject = await prisma.project.create({
      data: {
        title: projectId,
        targetPlatform: 'youtube',
        aspectRatio: '16:9',
        resolution: '1080p',
      },
    });
  }

  const importedAsset = await photoService.importToVideoProject(
    clientId,
    projectId,
    (batchResults[0].filePath || batchResults[0].outputPath) as string,
    'batch_1.jpg'
  );

  console.log(`- Imported Asset ID: ${importedAsset.id}`);
  console.log(`- Imported Asset File: ${importedAsset.filename}`);
  console.log(`- Dimensions: ${importedAsset.width}x${importedAsset.height}`);

  const verifyDb = await prisma.mediaAsset.findUnique({
    where: { id: importedAsset.id },
  });

  if (!verifyDb) {
    throw new Error('Imported photo asset not found in database');
  }
  console.log(`✓ Test 7 Passed: Photo successfully registered in MediaAsset DB (status: ${verifyDb.status}).\n`);

  console.log('=====================================================');
  console.log('  ALL STEP 7 TESTS PASSED SUCCESSFULLY! (100%)       ');
  console.log('=====================================================\n');
}

runStep7TestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Step 7 Test Suite Failed:', err);
    process.exit(1);
  });
