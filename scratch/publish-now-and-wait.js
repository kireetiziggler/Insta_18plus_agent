import dotenv from 'dotenv';
import db from '../services/db.js';
import publisher from '../services/publisher.js';

dotenv.config();

// Standard delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const settings = await db.getSettings();
  console.log('----------------------------------------------------');
  console.log('IMMEDIATE INSTAGRAM PUBLISHING RUNNER');
  console.log(`Simulation Mode: ${settings.isSimulationMode}`);
  console.log(`Page Handle: ${settings.pageHandle}`);
  console.log('----------------------------------------------------\n');

  // Hardcoded target post IDs matching the fresh draft entries in db.json
  const firstPostId = 'sample_post_after_update_morning_1781802587995';
  const secondPostId = 'sample_post_after_update_evening_1781802594873';

  // 1. Publish the first post immediately
  console.log(`[Step 1/3] Triggering immediate publication of the first post: "${firstPostId}" ("Kitchen Counter Sins")...`);
  try {
    const publishedPost1 = await publisher.publishPostToInstagram(firstPostId);
    console.log(`✓ Success: Published first post successfully!`);
    console.log(`Instagram Media ID / Buffer ID: ${publishedPost1.instagramMediaId || 'published'}\n`);
  } catch (err) {
    console.error(`✗ Error publishing first post:`, err.message);
  }

  // 2. Wait for 1 hour gap between the two posts
  // Since we are running in an interactive session, we'll output a notice.
  // We'll write this script so it can run immediately or be scheduled.
  // Note: To post immediately in this run, we can either wait in this script or let the user run them.
  // Let's implement the wait: 1 hour = 3600000 ms.
  console.log(`[Step 2/3] Waiting for exactly 1 hour (3600 seconds) before posting the second slide to prevent spam filters...`);
  
  const oneHourMs = 3600 * 1000;
  // Let's print progress every 5 minutes
  const intervalMs = 5 * 60 * 1000; 
  let elapsed = 0;

  while (elapsed < oneHourMs) {
    await delay(intervalMs);
    elapsed += intervalMs;
    const remainingMins = (oneHourMs - elapsed) / 60000;
    console.log(`  Waiting... ${remainingMins} minutes remaining.`);
  }

  // 3. Publish the second post
  console.log(`\n[Step 3/3] Triggering immediate publication of the second post: "${secondPostId}" ("Rain-Slicked Backseat")...`);
  try {
    const publishedPost2 = await publisher.publishPostToInstagram(secondPostId);
    console.log(`✓ Success: Published second post successfully!`);
    console.log(`Instagram Media ID / Buffer ID: ${publishedPost2.instagramMediaId || 'published'}`);
  } catch (err) {
    console.error(`✗ Error publishing second post:`, err.message);
  }
}

run().catch(err => {
  console.error('Error in runner script execution:', err);
  process.exit(1);
});
