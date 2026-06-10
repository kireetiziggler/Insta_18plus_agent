import db from '../services/db.js';
import reels from '../services/reels.js';
import scheduler from '../services/scheduler.js';

async function generateManualReel() {
  console.log('=============================================');
  console.log('MANUALLY TRIGGERING TODAY\'S DAILY SASSY REEL');
  console.log('=============================================\n');

  const settings = await db.getSettings();
  const originalSimMode = settings.isSimulationMode;

  // Temporarily disable simulation mode to compile a real video
  await db.updateSettings({
    isSimulationMode: false
  });
  console.log('✓ Disabled simulation mode to compile real MP4 video.');

  try {
    const categories = [
      'Motivation & Discipline',
      '20s Struggles & Career',
      'Emotional Life Lesson / Deep Story'
    ];
    // Pick a random category for variety
    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    console.log(`Selected Category: "${selectedCategory}"`);

    // Trigger the scheduled Reel compiler
    await scheduler.triggerScheduledReel(selectedCategory);

    console.log('\n✓ MANUALLY TRIGGERED REEL RUN COMPLETE!');
  } catch (err) {
    console.error('✗ Triggering failed:', err);
  } finally {
    // Restore original simulation mode setting
    await db.updateSettings({
      isSimulationMode: originalSimMode
    });
    console.log('✓ Restored original simulation settings.');
  }
}

generateManualReel();
