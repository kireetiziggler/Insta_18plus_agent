import db from '../services/db.js';
import scheduler from '../services/scheduler.js';

async function run() {
  console.log('====================================================');
  console.log('AURAGLOW - GENERATING ONE MORE POST & REEL');
  console.log('====================================================\n');

  try {
    // 1. Generate one more Carousel post
    const postCategory = '20s Struggles & Career';
    console.log(`Generating an additional Carousel Post for category: "${postCategory}"...`);
    await scheduler.triggerScheduledPost(postCategory);
    console.log('✓ Post generation completed.\n');

    // 2. Generate one more Reel
    const reelCategory = 'Love Failure / Relationships';
    console.log(`Generating an additional Reel for category: "${reelCategory}"...`);
    await scheduler.triggerScheduledReel(reelCategory);
    console.log('✓ Reel generation completed.\n');

    // 3. Print summary of posts currently in DB
    const finalDb = await db.load();
    console.log(`\nTotal Posts in Database (${finalDb.posts.length}):`);
    for (const post of finalDb.posts) {
      console.log(`- ID: ${post.id}`);
      console.log(`  Type: ${post.type || 'carousel'}`);
      console.log(`  Category: ${post.category}`);
      console.log(`  Status: ${post.status}`);
      if (post.type === 'reel') {
        console.log(`  Video: ${post.renderedVideo}`);
      } else {
        console.log(`  Images Count: ${post.renderedImages ? post.renderedImages.length : 0}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error generating additional content:', error);
    process.exit(1);
  }
}

run();
