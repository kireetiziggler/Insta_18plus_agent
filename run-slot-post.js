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

  // Override db settings with secrets injected from GitHub Action Environment variables
  const overrides = {};
  if (process.env.GEMINI_API_KEY) overrides.geminiApiKey = process.env.GEMINI_API_KEY;
  if (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) overrides.instagramBusinessId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (process.env.FACEBOOK_PAGE_ACCESS_TOKEN) overrides.facebookPageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (process.env.PAGE_HANDLE) overrides.pageHandle = process.env.PAGE_HANDLE;
  if (process.env.ELEVENLABS_API_KEY) overrides.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  if (process.env.ELEVENLABS_VOICE_ID) overrides.elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID;
  if (process.env.BUFFER_ACCESS_TOKEN) overrides.bufferAccessToken = process.env.BUFFER_ACCESS_TOKEN;
  if (process.env.BUFFER_CHANNEL_ID) overrides.bufferChannelId = process.env.BUFFER_CHANNEL_ID;

  // GitHub Actions always pushes to production (simulation = false) unless override is set
  if (process.env.IS_SIMULATION_MODE !== undefined && process.env.IS_SIMULATION_MODE !== '') {
    overrides.isSimulationMode = process.env.IS_SIMULATION_MODE === 'true';
  } else if (process.env.BUFFER_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    overrides.isSimulationMode = false;
  }

  await db.updateSettings(overrides);

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
