import db from '../services/db.js';
import reels from '../services/reels.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateSassyReel() {
  console.log('=============================================');
  console.log('GENERATING SASSY FEMALE REEL WITH 1s CTA GAP');
  console.log('=============================================\n');

  const timestamp = Date.now();
  const newPostId = `reel_sassy_${timestamp}`;
  const postDir = path.join(__dirname, '..', 'data', 'posts', newPostId);

  // 1. Temporarily disable simulation mode to compile a real MP4 video
  const settings = await db.getSettings();
  const originalSimMode = settings.isSimulationMode;
  
  await db.updateSettings({
    ...settings,
    isSimulationMode: false
  });
  console.log('✓ Disabled simulation mode for compilation.');

  try {
    // Motivation & Discipline category, using unique dark query
    const category = 'Motivation & Discipline';
    console.log(`Selected Category: "${category}"`);
    console.log(`Selected Voice ID: "${settings.elevenLabsVoiceId}" (Laura - Sassy/Quirky)`);

    console.log(`\nStarting Reels workflow in folder: data/posts/${newPostId}...`);
    const result = await reels.generateReel(newPostId, category);

    console.log('\n✓ REEL GENERATION COMPLETE!');
    console.log('---------------------------------------------');
    console.log(`- Post ID: ${result.id}`);
    console.log(`- Visual Theme: ${result.backgroundTheme}`);
    console.log(`- Title: ${result.titleText}`);
    console.log(`- Caption: ${result.caption}`);
    console.log(`- Audio script: "${result.audioScript}"`);
    console.log('---------------------------------------------');
    console.log('\nFiles Generated:');
    console.log(`1. Slide Watermark Slide:     data/posts/${newPostId}/slide.png`);
    console.log(`2. CTA Centered Slide:        data/posts/${newPostId}/cta.png`);
    console.log(`3. Narration Main audio track: data/posts/${newPostId}/audio_main.mp3`);
    console.log(`4. Narration CTA audio track:  data/posts/${newPostId}/audio_cta.mp3`);
    console.log(`5. Concatenated audio track:   data/posts/${newPostId}/audio.mp3`);
    console.log(`6. Final Compiled Video:       data/posts/${newPostId}/reel.mp4`);

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

generateSassyReel();
