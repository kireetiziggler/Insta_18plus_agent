import db from './services/db.js';
import trendAgent from './services/trendAgent.js';
import { triggerScheduledPost, triggerScheduledReel } from './services/scheduler.js';
import dotenv from 'dotenv';

dotenv.config();

// Determine the post category based on the current hour in Indian Standard Time (IST)
function getCategoryByLocalHour() {
  const date = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hour = date.getHours();

  console.log(`Current local time in IST: ${date.toLocaleTimeString()} (Hour: ${hour})`);

  // Map local hours to the two target categories (handles slight latency)
  if (hour >= 5 && hour <= 12) {
    return 'Anonymous Confessions'; // 07:00 AM Morning Slot
  } else {
    return 'Intimate Secrets'; // 09:00 PM Evening Slot
  }
}

async function run() {
  console.log('========================================================');
  console.log('UNSPOKEN DESIRES - GITHUB ACTIONS SCHEDULER ACTIVE');
  console.log('========================================================\n');

  // Note: Environment secrets are dynamically loaded in-memory by db.getSettings() and never written to db.json


  // 1. Always run Trend Research first to refresh with the latest Reddit topics
  try {
    console.log('Running Trend Research Agent to crawl latest topics...');
    await trendAgent.runTrendResearch();
  } catch (error) {
    console.error('Trend research failed (will continue with existing/offline templates):', error.message);
  }

  // 2. Determine slot type and execute workflow
  const triggerType = process.env.TRIGGER_TYPE || 'auto';
  const date = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hour = date.getHours();

  const isReelSlot = triggerType === 'reel';

  if (isReelSlot) {
    console.log(`Triggering scheduled Reel workflow (Trigger Type: ${triggerType})...`);
    const categories = [
      'Desire & Physical Intimacy',
      'Secret Thoughts & Overthinking',
      'Situationships & Forbidden Love',
      'Romantic Tension & Chemistry',
      'Intimate Heartbreak & Healing'
    ];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    try {
      await triggerScheduledReel(randomCategory);
      console.log('\n✓ Reel sequence completed successfully.');
      process.exit(0);
    } catch (error) {
      console.error('\n✗ Error executing Reel sequence:', error);
      process.exit(1);
    }
  } else {
    const category = getCategoryByLocalHour();
    console.log(`Target Niche Slot Category: "${category}" (Trigger Type: ${triggerType})`);

    try {
      await triggerScheduledPost(category);
      console.log('\n✓ Post sequence completed successfully.');
      process.exit(0);
    } catch (error) {
      console.error('\n✗ Error executing post sequence:', error);
      process.exit(1);
    }
  }
}

run();
