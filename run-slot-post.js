import db from './services/db.js';
import trendAgent from './services/trendAgent.js';
import { triggerScheduledPost, triggerScheduledReel } from './services/scheduler.js';
import dotenv from 'dotenv';

dotenv.config();

// Determine the post action based on the current hour in Indian Standard Time (IST)
function determineActionByLocalHour() {
  const date = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hour = date.getHours();

  console.log(`Current local time in IST: ${date.toLocaleTimeString()} (Hour: ${hour})`);

  // Morning Slot (roughly 5 AM to 12 PM): 9:00 AM Post -> 'Anonymous Confessions'
  if (hour >= 5 && hour < 14) {
    return { type: 'post', category: 'Anonymous Confessions' };
  }
  // Afternoon Slot (roughly 14:00 to 18:30): 6:00 PM Reel -> 'Desire & Physical Intimacy' (reel)
  else if (hour >= 14 && hour < 19) {
    return { type: 'reel', category: 'Desire & Physical Intimacy' };
  }
  // Night Slot (19:00 onwards): 8:00 PM Post -> 'Intimate Secrets'
  else {
    return { type: 'post', category: 'Intimate Secrets' };
  }
}

async function run() {
  console.log('========================================================');
  console.log('UNSPOKEN DESIRES - GITHUB ACTIONS SCHEDULER ACTIVE');
  console.log('========================================================\n');

  // 1. Always run Trend Research first to refresh with the latest Reddit topics
  try {
    console.log('Running Trend Research Agent to crawl latest topics...');
    await trendAgent.runTrendResearch();
  } catch (error) {
    console.error('Trend research failed (will continue with existing/offline templates):', error.message);
  }

  // 2. Determine slot action and execute workflow
  const triggerType = process.env.TRIGGER_TYPE || 'auto';
  
  let targetAction = { type: 'post', category: 'Anonymous Confessions' };

  if (triggerType === 'reel') {
    targetAction = { type: 'reel', category: 'Desire & Physical Intimacy' };
  } else if (triggerType === 'post') {
    const cat = process.env.CATEGORY_OVERRIDE && process.env.CATEGORY_OVERRIDE !== 'auto' 
      ? process.env.CATEGORY_OVERRIDE 
      : 'Anonymous Confessions';
    targetAction = { type: 'post', category: cat };
  } else {
    // auto mode based on current IST time slot
    targetAction = determineActionByLocalHour();
  }

  console.log(`Executing target action: Type: "${targetAction.type}" | Category: "${targetAction.category}"`);

  if (targetAction.type === 'reel') {
    try {
      await triggerScheduledReel(targetAction.category);
      console.log('\n✓ Reel sequence completed successfully.');
      process.exit(0);
    } catch (error) {
      console.error('\n✗ Error executing Reel sequence:', error);
      process.exit(1);
    }
  } else {
    try {
      await triggerScheduledPost(targetAction.category);
      console.log('\n✓ Post sequence completed successfully.');
      process.exit(0);
    } catch (error) {
      console.error('\n✗ Error executing post sequence:', error);
      process.exit(1);
    }
  }
}

run();
