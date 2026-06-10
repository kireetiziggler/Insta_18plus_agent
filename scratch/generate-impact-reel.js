import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../services/db.js';
import scheduler from '../services/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('====================================================');
  console.log('AURAGLOW - GENERATING HIGH-IMPACT DIRECT VOICE REEL');
  console.log('====================================================\n');

  try {
    const database = await db.load();

    // 1. Wipe previous Reels from database and folder to start fresh
    const reelsList = database.posts.filter(p => p.type === 'reel');
    for (const reel of reelsList) {
      console.log(`Deleting previous Reel: ${reel.id}`);
      await db.deletePost(reel.id);
    }
    console.log('✓ Cleared all previous Reel folders and database entries.\n');

    // 2. Temporarily set the voice to Adam (pNInz6obpgDQGcFmaJgB)
    const settings = await db.getSettings();
    const originalVoiceId = settings.elevenLabsVoiceId;
    
    await db.updateSettings({
      ...settings,
      elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB' // Adam - Deep, Confident, Direct/Firm
    });
    console.log('✓ Temporarily locked voice to "Adam" (pNInz6obpgDQGcFmaJgB) to avoid 402 library voice errors.');

    // 3. Trigger the scheduled Reel generation with category 'Motivation & Discipline'
    const reelCategory = 'Motivation & Discipline';
    console.log(`Triggering generation of fresh Reel for category: "${reelCategory}"`);
    
    await scheduler.triggerScheduledReel(reelCategory);
    console.log('\n✓ High-impact Reel generation complete.');

    // 4. Restore original settings
    await db.updateSettings({
      ...settings,
      elevenLabsVoiceId: originalVoiceId
    });
    console.log('✓ Restored database voice settings to original.');

    // 5. Output database verification details
    const finalDb = await db.load();
    const newReels = finalDb.posts.filter(p => p.type === 'reel');
    console.log(`\nReels currently in database (${newReels.length}):`);
    for (const newReel of newReels) {
      console.log(`- ID: ${newReel.id}`);
      console.log(`  Title: ${newReel.titleText}`);
      console.log(`  Audio script: "${newReel.audioScript}"`);
      console.log(`  Video file: ${newReel.renderedVideo}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error compiling high-impact Reel:', error);
    process.exit(1);
  }
}

run();
