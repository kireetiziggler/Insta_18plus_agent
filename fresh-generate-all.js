import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './services/db.js';
import scheduler from './services/scheduler.js';
import trendAgent from './services/trendAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('====================================================');
  console.log('UNSPOKEN DESIRES - FRESH RE-GENERATION (ALL TODAY CONTENT)');
  console.log('====================================================\n');

  try {
    // 1. Clean data/posts directory
    const postsDir = path.join(__dirname, 'data', 'posts');
    console.log(`Clearing generated files under: ${postsDir}`);
    
    try {
      const items = await fs.readdir(postsDir);
      for (const item of items) {
        const itemPath = path.join(postsDir, item);
        console.log(`- Deleting: ${item}`);
        await fs.rm(itemPath, { recursive: true, force: true });
      }
      console.log('✓ Cleared all files from data/posts/\n');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Warning while cleaning data/posts directory:', err.message);
      } else {
        await fs.mkdir(postsDir, { recursive: true });
        console.log('✓ Created data/posts/ directory\n');
      }
    }

    // 2. Load and reset the database posts array
    console.log('Loading database and clearing previous posts...');
    const database = await db.load();
    database.posts = [];
    database.logs = [];
    
    // Temporarily lock the voice to Adam (pNInz6obpgDQGcFmaJgB) for both reels
    const originalVoiceId = database.settings.elevenLabsVoiceId;
    database.settings.elevenLabsVoiceId = 'pNInz6obpgDQGcFmaJgB';
    
    await db.save();
    console.log('✓ Database posts array and logs reset. Voice locked to "Adam".\n');

    // 3. Run Trend Research to fetch unique topics from Reddit
    console.log('Running Trend Research Agent to gather fresh topics...');
    try {
      await trendAgent.runTrendResearch();
      console.log('✓ Trend research completed and populated in database.\n');
    } catch (trendErr) {
      console.error('Warning: Trend research failed:', trendErr.message);
    }

    // 4. Generate Main Post (Carousel - Secret Thoughts & Overthinking)
    const postCategory1 = 'Secret Thoughts & Overthinking';
    console.log(`Generating Main Carousel Post for category: "${postCategory1}"...`);
    await scheduler.triggerScheduledPost(postCategory1);
    console.log('✓ Main Carousel Post generation completed.\n');

    // 5. Generate Main Reel (Desire & Physical Intimacy)
    const reelCategory1 = 'Desire & Physical Intimacy';
    console.log(`Generating Main Reel for category: "${reelCategory1}"...`);
    await scheduler.triggerScheduledReel(reelCategory1);
    console.log('✓ Main Reel generation completed.\n');

    // 6. Generate One More Post (Carousel - Romantic Tension & Chemistry)
    const postCategory2 = 'Romantic Tension & Chemistry';
    console.log(`Generating Additional Carousel Post for category: "${postCategory2}"...`);
    await scheduler.triggerScheduledPost(postCategory2);
    console.log('✓ Additional Carousel Post generation completed.\n');

    // 7. Generate One More Reel (Situationships & Forbidden Love)
    const reelCategory2 = 'Situationships & Forbidden Love';
    console.log(`Generating Additional Reel for category: "${reelCategory2}"...`);
    await scheduler.triggerScheduledReel(reelCategory2);
    console.log('✓ Additional Reel generation completed.\n');

    // 8. Restore original settings (if they weren't 'pNInz6obpgDQGcFmaJgB')
    const finalDatabase = await db.load();
    finalDatabase.settings.elevenLabsVoiceId = originalVoiceId;
    await db.save();
    console.log('✓ Restored original voice settings in database.\n');

    console.log('====================================================');
    console.log('RUN COMPLETE - ALL RE-GENERATIONS ARE SUCCESSFUL');
    console.log('====================================================');

    console.log(`\nGenerated Posts in Database (${finalDatabase.posts.length}):`);
    for (const post of finalDatabase.posts) {
      console.log(`- ID: ${post.id}`);
      console.log(`  Type: ${post.type || 'carousel'}`);
      console.log(`  Category: ${post.category}`);
      console.log(`  Status: ${post.status}`);
      if (post.type === 'reel') {
        console.log(`  Video Path: ${post.renderedVideo}`);
      } else {
        console.log(`  Images Count: ${post.renderedImages ? post.renderedImages.length : 0}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error during fresh re-generation run:', error);
    process.exit(1);
  }
}

run();
