import db from '../services/db.js';
import reels from '../services/reels.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateSampleReel() {
  console.log('=============================================');
  console.log('GENERATING SAMPLE AI DYNAMIC VIDEO REEL');
  console.log('=============================================\n');

  const sampleId = 'reel_sample_run';
  const postDir = path.join(__dirname, '..', 'data', 'posts', sampleId);

  // 1. Clean up any previous runs
  await db.deletePost(sampleId);
  await fs.rm(postDir, { recursive: true, force: true });

  // 2. Temporarily disable simulation mode to compile a real MP4 video
  const settings = await db.getSettings();
  const originalSimMode = settings.isSimulationMode;
  
  await db.updateSettings({
    ...settings,
    isSimulationMode: false
  });
  console.log('✓ Disabled simulation mode for compilation.');

  try {
    console.log('\nStarting Reels generation workflow (AI Content -> Puppeteer -> TTS -> FFmpeg)...');
    const result = await reels.generateReel(sampleId, 'Motivation & Discipline');

    console.log('\n✓ REEL GENERATION COMPLETE!');
    console.log('---------------------------------------------');
    console.log(`- Post ID: ${result.id}`);
    console.log(`- Visual Theme: ${result.backgroundTheme}`);
    console.log(`- Title: ${result.titleText}`);
    console.log(`- Caption: ${result.caption}`);
    console.log(`- Audio script: "${result.audioScript}"`);
    console.log('---------------------------------------------');
    console.log('\nFiles Generated:');
    console.log(`1. Typography Slide Graphic: data/posts/${sampleId}/slide.png`);
    console.log(`2. Narration Audio Track:    data/posts/${sampleId}/audio.mp3`);
    console.log(`3. Final Compiled Video:     data/posts/${sampleId}/reel.mp4`);

    const stat = await fs.stat(path.join(postDir, 'reel.mp4'));
    console.log(`\n✓ Success: Reel video generated successfully (${(stat.size / (1024 * 1024)).toFixed(2)} MB).`);
    console.log('This Reel has been saved in the database as "scheduled".');
    console.log('You can open your local dashboard (npm start) and preview it in the Calendar tab!');

  } catch (err) {
    console.error('✗ Failed: Reels generation failed:', err);
  } finally {
    // Restore simulation mode settings
    await db.updateSettings({
      ...settings,
      isSimulationMode: originalSimMode
    });
    console.log('\n✓ Restored original simulation mode settings.');
  }
}

generateSampleReel();
