import db from '../services/db.js';
import reels from '../services/reels.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testReelCompile() {
  console.log('=============================================');
  console.log('TESTING DYNAMIC VIDEO REELS STITCHING');
  console.log('=============================================\n');

  const testReelId = 'test_dynamic_reel_run';
  const postDir = path.join(__dirname, '..', 'data', 'posts', testReelId);

  // 1. Load settings and disable simulation mode temporarily for testing
  const settings = await db.getSettings();
  const originalSimMode = settings.isSimulationMode;
  
  await db.updateSettings({
    ...settings,
    isSimulationMode: false
  });
  console.log('✓ Temorarily disabled simulation mode for real FFmpeg compile.');

  try {
    const titleText = "This is a *dynamic background* test run.";
    const theme = 'rain';
    const category = 'Motivation & Discipline';
    const audioScript = "Every step you take in the dark is preparing you for the light. Keep moving forward.";

    console.log(`\nCompiling test Reel with theme: "${theme}"...`);
    const result = await reels.compileReel(testReelId, titleText, theme, category, audioScript);

    console.log('\n✓ Reel assets compiled successfully:');
    console.log(`  - Slide PNG: ${result.renderedImages[0]}`);
    console.log(`  - Audio MP3: ${result.renderedAudio}`);
    console.log(`  - Video MP4: ${result.renderedVideo}`);

    // Check physical file sizes to ensure they are real
    const videoFullPath = path.join(postDir, 'reel.mp4');
    const stat = await fs.stat(videoFullPath);
    console.log(`  - Video File Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);

    if (stat.size < 5000) {
      throw new Error(`Generated video is too small (${stat.size} bytes). Compilation likely failed.`);
    }
    console.log('✓ Success: Video is valid and non-empty.');

  } catch (err) {
    console.error('✗ Failed: Reels compilation failed:', err);
  } finally {
    // Restore simulation mode settings
    await db.updateSettings({
      ...settings,
      isSimulationMode: originalSimMode
    });
    console.log('\n✓ Restored original simulation mode settings.');

    // Clean up compiled files
    try {
      await fs.rm(postDir, { recursive: true, force: true });
      console.log('✓ Cleaned up test files.');
    } catch (e) {
      console.error('Failed to clean up test folder:', e.message);
    }
  }
}

testReelCompile();
