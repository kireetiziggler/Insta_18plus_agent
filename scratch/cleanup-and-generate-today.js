import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../services/db.js';
import scheduler from '../services/scheduler.js';
import trendAgent from '../services/trendAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanAndGenerate() {
  console.log('====================================================');
  console.log('AURAGLOW - WORKSPACE CLEANUP & FRESH GENERATION RUN');
  console.log('====================================================\n');

  try {
    // 1. Clean data/posts directory
    const postsDir = path.join(__dirname, '..', 'data', 'posts');
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
    // Retain logs or clear them? Let's clear them so logs start fresh for today's run
    database.logs = [];
    await db.save();
    console.log('✓ Database posts array and logs reset. Settings preserved.\n');

    // 3. Run Trend Research to fetch unique topics from Reddit
    console.log('Running Trend Research Agent to gather fresh topics...');
    try {
      await trendAgent.runTrendResearch();
      console.log('✓ Trend research completed and populated in database.\n');
    } catch (trendErr) {
      console.error('Warning: Trend research failed (will fall back to unique templates):', trendErr.message);
    }

    // 4. Generate today's Post (Carousel)
    const postCategory = 'IT Job Struggles';
    console.log(`Generating fresh Carousel Post for category: "${postCategory}"...`);
    await scheduler.triggerScheduledPost(postCategory);
    console.log('✓ Carousel Post generation sequence finished.\n');

    // 5. Generate today's Reel
    const reelCategory = 'Motivation & Discipline';
    console.log(`Generating fresh Reel for category: "${reelCategory}"...`);
    await scheduler.triggerScheduledReel(reelCategory);
    console.log('✓ Reel generation sequence finished.\n');

    console.log('====================================================');
    console.log('RUN COMPLETE - TODAY\'S POST AND REEL HAVE BEEN CREATED');
    console.log('====================================================');

    // Load final DB to show success summary
    const finalDb = await db.load();
    console.log(`\nGenerated Posts in Database (${finalDb.posts.length}):`);
    for (const post of finalDb.posts) {
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
    console.error('\n✗ Error during cleanup and generation run:', error);
    process.exit(1);
  }
}

cleanAndGenerate();
