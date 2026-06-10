import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../services/db.js';
import scheduler from '../services/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('====================================================');
  console.log('AURAGLOW - GENERATING NEW INDIAN VOICE REEL');
  console.log('====================================================\n');

  try {
    const database = await db.load();

    // 1. Find and delete the previous Reel to prevent clutter
    const previousReel = database.posts.find(p => p.type === 'reel');
    if (previousReel) {
      console.log(`Deleting previous Reel: ${previousReel.id}`);
      await db.deletePost(previousReel.id);
      console.log('✓ Wiped previous Reel folder and database entry.\n');
    }

    // 2. Trigger the scheduled Reel generation with category 'Motivation & Discipline'
    const reelCategory = 'Motivation & Discipline';
    console.log(`Triggering generation of fresh Reel for category: "${reelCategory}"`);
    console.log(`Using Indian English Voice ID: "MF4J4IDTRo0AxOO4dpFR" (Devi)`);
    
    await scheduler.triggerScheduledReel(reelCategory);
    console.log('\n✓ Indian Voice Reel generation complete.');

    // 3. Output database verification details
    const finalDb = await db.load();
    const newReel = finalDb.posts.find(p => p.type === 'reel');
    if (newReel) {
      console.log('\nNew Reel Details:');
      console.log(`- ID: ${newReel.id}`);
      console.log(`- Title: ${newReel.titleText}`);
      console.log(`- Audio script: "${newReel.audioScript}"`);
      console.log(`- Video file: ${newReel.renderedVideo}`);
    } else {
      console.log('\nWarning: Reel not found in database after generation.');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error compiling Indian voice Reel:', error);
    process.exit(1);
  }
}

run();
