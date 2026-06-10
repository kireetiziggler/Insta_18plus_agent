import cron from 'node-cron';
import db from './db.js';
import trendAgent from './trendAgent.js';
import generator from './generator.js';
import renderer from './renderer.js';
import publisher from './publisher.js';
import reels from './reels.js';

let activeCronJobs = [];

// Convert HH:MM time string to standard cron expression (every day at HH:MM)
function timeToCron(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  return `${minutes} ${hours} * * *`;
}

// Perform generation, rendering, and publishing for a single category slot
export async function triggerScheduledPost(category) {
  await db.log('SYSTEM', `Triggering scheduled post workflow for category: "${category}"`);
  
  try {
    // 1. Fetch unused trends matching this category
    const trends = await db.getTrends();
    const matchingTrend = trends.find(t => t.category === category && !t.used);
    
    let topicQuery = null;
    if (matchingTrend) {
      topicQuery = matchingTrend.suggestedTopic;
      matchingTrend.used = true;
      await db.saveTrends(trends);
      await db.log('SYSTEM', `Using trend topic for generation: "${topicQuery}"`);
    } else {
      await db.log('SYSTEM', `No unused trends found for "${category}". Generating generic niche post.`);
    }

    // 2. Generate content (Gemini or offline template)
    const content = await generator.generatePostContent(category, topicQuery);

    // 3. Create database entry
    const postId = `post_${Date.now()}`;
    const newPost = {
      id: postId,
      category,
      backgroundTheme: content.backgroundTheme,
      slides: content.slides,
      caption: content.caption,
      scheduledFor: new Date().toISOString(),
      status: 'draft',
      createdAt: new Date().toISOString()
    };
    await db.savePost(newPost);

    // 4. Render graphics using Puppeteer
    await db.log('SYSTEM', `Rendering slide graphics for post "${postId}"...`);
    const renderedPaths = await renderer.renderPostSlides(postId, content.slides, content.backgroundTheme, category);
    
    newPost.renderedImages = renderedPaths;
    newPost.status = 'scheduled';
    await db.savePost(newPost);

    // 5. Publish to Instagram
    await publisher.publishPostToInstagram(postId);

  } catch (error) {
    await db.log('ERROR', `Scheduled post workflow failed for "${category}": ${error.message}`);
  }
}

// Perform generation, rendering, voice synthesis, stitching, and publishing for a single Reel slot
export async function triggerScheduledReel(category) {
  await db.log('SYSTEM', `Triggering scheduled Reel workflow for category: "${category}"`);
  
  try {
    // 1. Fetch unused trends matching this category
    const trends = await db.getTrends();
    const matchingTrend = trends.find(t => t.category === category && !t.used);
    
    let topicQuery = null;
    if (matchingTrend) {
      topicQuery = matchingTrend.suggestedTopic;
      matchingTrend.used = true;
      await db.saveTrends(trends);
      await db.log('SYSTEM', `Using trend topic for Reel generation: "${topicQuery}"`);
    } else {
      await db.log('SYSTEM', `No unused trends found for Reel "${category}". Generating generic niche Reel.`);
    }

    // 2. Generate and compile Reel (script, audio, video)
    const postId = `reel_${Date.now()}`;
    await db.log('SYSTEM', `Running Reels generation workflow for "${postId}"...`);
    await reels.generateReel(postId, category, topicQuery);

    // 3. Publish to Instagram
    await publisher.publishPostToInstagram(postId);

  } catch (error) {
    await db.log('ERROR', `Scheduled Reel workflow failed for "${category}": ${error.message}`);
  }
}

// Sync insights for all published posts in the last 7 days
async function syncRecentPostsAnalytics() {
  await db.log('SYSTEM', 'Running analytics sync job...');
  try {
    const posts = await db.getPosts();
    const publishedPosts = posts.filter(p => p.status === 'published');
    
    let updatedCount = 0;
    for (const post of publishedPosts) {
      // Sync stats if published within the last 7 days
      const ageInDays = (new Date() - new Date(post.publishedAt)) / (1000 * 60 * 60 * 24);
      if (ageInDays <= 7) {
        await publisher.syncPostAnalytics(post.id);
        updatedCount++;
      }
    }
    await db.log('SYSTEM', `Analytics sync completed. Updated metrics for ${updatedCount} posts.`);
  } catch (error) {
    await db.log('ERROR', `Analytics sync failed: ${error.message}`);
  }
}

// Clear active jobs and rebuild schedules based on DB settings
export async function initScheduler() {
  // Clear any existing jobs
  activeCronJobs.forEach(job => job.stop());
  activeCronJobs = [];

  const settings = await db.getSettings();
  const sched = settings.postingSchedule;

  await db.log('SYSTEM', 'Initializing cron jobs based on posting schedule settings...');

  // Setup the 5 daily posting slots
  const slots = [
    { time: sched.post1, category: 'Desire & Physical Intimacy' },
    { time: sched.post2, category: 'Secret Thoughts & Overthinking' },
    { time: sched.post3, category: 'Situationships & Forbidden Love' },
    { time: sched.post4, category: 'Romantic Tension & Chemistry' },
    { time: sched.post5, category: 'Intimate Heartbreak & Healing' }
  ];

  slots.forEach(slot => {
    try {
      const cronExpr = timeToCron(slot.time);
      const job = cron.schedule(cronExpr, () => {
        triggerScheduledPost(slot.category);
      }, {
        timezone: "Asia/Kolkata" // Match user's local system timezone
      });
      activeCronJobs.push(job);
      console.log(`Scheduled: "${slot.category}" at ${slot.time} (Cron: ${cronExpr})`);
    } catch (e) {
      console.error(`Failed scheduling ${slot.category} at time ${slot.time}:`, e);
    }
  });

  // Setup the daily Reels slot
  if (sched.reel1) {
    try {
      const cronExpr = timeToCron(sched.reel1);
      const job = cron.schedule(cronExpr, () => {
        const categories = [
          'Desire & Physical Intimacy',
          'Secret Thoughts & Overthinking',
          'Situationships & Forbidden Love',
          'Romantic Tension & Chemistry',
          'Intimate Heartbreak & Healing'
        ];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        triggerScheduledReel(randomCategory);
      }, {
        timezone: "Asia/Kolkata"
      });
      activeCronJobs.push(job);
      console.log(`Scheduled Daily Reel at ${sched.reel1} (Cron: ${cronExpr})`);
    } catch (e) {
      console.error(`Failed scheduling Reel at time ${sched.reel1}:`, e);
    }
  }

  // Setup Daily Trend Research Agent at 04:00 AM
  try {
    const researchJob = cron.schedule('0 4 * * *', () => {
      trendAgent.runTrendResearch();
    }, {
      timezone: "Asia/Kolkata"
    });
    activeCronJobs.push(researchJob);
    console.log('Scheduled: Daily Trend Research Agent at 04:00 AM');
  } catch (e) {
    console.error('Failed scheduling Daily Trend Research:', e);
  }

  // Setup Hourly Analytics Sync job
  try {
    const syncJob = cron.schedule('0 * * * *', () => {
      syncRecentPostsAnalytics();
    });
    activeCronJobs.push(syncJob);
    console.log('Scheduled: Hourly Analytics Sync');
  } catch (e) {
    console.error('Failed scheduling Analytics Sync:', e);
  }

  await db.log('SYSTEM', `Scheduler active with ${activeCronJobs.length} running tasks.`);
}

export default {
  initScheduler,
  triggerScheduledPost,
  triggerScheduledReel
};
