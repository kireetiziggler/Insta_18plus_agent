import db from '../services/db.js';
import publisher from '../services/publisher.js';

async function publishPending() {
  console.log('=============================================');
  console.log('PUBLISHING ALL PENDING SCHEDULED POSTS');
  console.log('=============================================\n');

  try {
    const posts = await db.getPosts();
    // Find all posts that are generated ('scheduled') but not yet published
    const pending = posts.filter(p => p.status === 'scheduled');
    
    console.log(`Found ${pending.length} pending scheduled posts/reels.`);

    for (const post of pending) {
      console.log(`\nTriggering publishing flow for post "${post.id}" (Category: "${post.category}", Type: "${post.type || 'carousel'}")`);
      try {
        const publishedPost = await publisher.publishPostToInstagram(post.id);
        console.log(`✓ Successfully published post "${post.id}". Status: ${publishedPost.status}`);
      } catch (err) {
        console.error(`✗ Failed to publish post "${post.id}":`, err.message);
      }
    }
    console.log('\n✓ Publish pending sequence completed.');
  } catch (err) {
    console.error('✗ Failed to publish pending posts:', err);
  }
}

publishPending();
