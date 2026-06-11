import db from './db.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to upload a local asset to tmpfiles.org to get a temporary public URL for Instagram API
async function uploadToPublicHost(localFilePath) {
  try {
    const fileBuffer = await fs.readFile(localFilePath);
    const ext = path.extname(localFilePath).toLowerCase();
    let type = 'image/png';
    if (ext === '.mp4') type = 'video/mp4';
    if (ext === '.mp3') type = 'audio/mpeg';

    const blob = new Blob([fileBuffer], { type });
    const formData = new FormData();
    formData.append('file', blob, path.basename(localFilePath));

    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const json = await response.json();
    if (json.status !== 'success' || !json.data || !json.data.url) {
      throw new Error('Upload API returned unsuccessful response');
    }

    // Tmpfiles URLs are formatted like: https://tmpfiles.org/12345/filename.png
    // The direct download link is: https://tmpfiles.org/dl/12345/filename.png
    const publicUrl = json.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
    return publicUrl;
  } catch (error) {
    console.error(`Failed to upload ${path.basename(localFilePath)} to public host:`, error);
    throw error;
  }
}

// Sleeps for specified milliseconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function publishPostToInstagram(postId) {
  const post = await db.getPost(postId);
  if (!post) {
    throw new Error(`Post with ID ${postId} not found in database`);
  }

  const settings = await db.getSettings();
  const isSimulation = settings.isSimulationMode;
  const isReel = post.type === 'reel';

  await db.log('PUBLISHER', `Triggering publication flow for post ID "${postId}" (Type: ${post.type || 'carousel'}, Simulation: ${isSimulation})`);

  if (isSimulation) {
    if (isReel) {
      await db.log('PUBLISHER', `[Simulation] Uploading Reel video to simulated Instagram CDN...`);
      await sleep(2000);
      await db.log('PUBLISHER', `[Simulation] Creating Reel container and applying caption...`);
      await sleep(1000);
      await db.log('PUBLISHER', `[Simulation] Publishing Reel successfully to feeds!`);

      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      post.instagramMediaId = `sim_reel_${Math.floor(Math.random() * 1000000000)}`;
      post.analytics = {
        reach: Math.floor(800 + Math.random() * 3000),
        shares: Math.floor(30 + Math.random() * 250),
        saves: Math.floor(40 + Math.random() * 300),
        likes: Math.floor(100 + Math.random() * 1000),
        comments: Math.floor(5 + Math.random() * 80)
      };
      await db.savePost(post);
      await db.log('PUBLISHER', `Reel "${postId}" published successfully (Simulated)`);
      return post;
    } else {
      const slideCount = post.slides ? post.slides.length : 1;
      await db.log('PUBLISHER', `[Simulation] Uploading ${slideCount} slide(s) to simulated Instagram CDN...`);
      await sleep(1500);
      await db.log('PUBLISHER', `[Simulation] Compiling feed post item(s) and applying caption...`);
      await sleep(1000);
      await db.log('PUBLISHER', `[Simulation] Publishing post successfully to feed!`);

      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      post.instagramMediaId = `sim_ig_${Math.floor(Math.random() * 1000000000)}`;
      // Initialize blank analytics
      post.analytics = {
        reach: Math.floor(250 + Math.random() * 800),
        shares: Math.floor(10 + Math.random() * 80),
        saves: Math.floor(15 + Math.random() * 120),
        likes: Math.floor(40 + Math.random() * 200),
        comments: Math.floor(2 + Math.random() * 25)
      };
      await db.savePost(post);
      await db.log('PUBLISHER', `Post "${postId}" published successfully (Simulated)`);
      return post;
    }
  }

  // Real publishing flow
  const { instagramBusinessId, facebookPageToken } = settings;
  if (!instagramBusinessId || !facebookPageToken) {
    const errorMsg = 'Instagram Business ID or Facebook Page Access Token is missing in settings. Cannot publish.';
    await db.log('ERROR', errorMsg);
    post.status = 'failed';
    await db.savePost(post);
    throw new Error(errorMsg);
  }

  try {
    post.status = 'publishing';
    await db.savePost(post);

    const absolutePostDir = path.join(__dirname, '..', 'data', 'posts', postId);

    if (isReel) {
      const videoLocalPath = path.join(absolutePostDir, 'reel.mp4');
      await db.log('PUBLISHER', `Uploading Reel video to temporary hosting...`);
      const publicVideoUrl = await uploadToPublicHost(videoLocalPath);
      await db.log('PUBLISHER', `Reel video uploaded: ${publicVideoUrl}`);

      // Create Reel container
      await db.log('PUBLISHER', `Creating Instagram Reels media container...`);
      const containerUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}/media`;
      const response = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: publicVideoUrl,
          caption: post.caption,
          access_token: facebookPageToken
        })
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.id) {
        throw new Error(`Failed to create Reel container: ${JSON.stringify(resJson)}`);
      }
      const containerId = resJson.id;
      await db.log('PUBLISHER', `Reel container created: ${containerId}. Polling status...`);

      // Poll container status until FINISHED
      let status = 'IN_PROGRESS';
      let attempts = 0;
      const maxAttempts = 30; // 2.5 minutes max wait
      
      while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
        await sleep(5000);
        attempts++;
        await db.log('PUBLISHER', `Checking Reel container status (Attempt ${attempts}/${maxAttempts})...`);
        
        const statusResponse = await fetch(`https://graph.facebook.com/v19.0/${containerId}?fields=status_code,status&access_token=${facebookPageToken}`);
        const statusJson = await statusResponse.json();
        
        if (!statusResponse.ok) {
          await db.log('ERROR', `Failed to fetch container status: ${JSON.stringify(statusJson)}`);
          continue;
        }
        
        status = statusJson.status_code || 'IN_PROGRESS';
        await db.log('PUBLISHER', `Status response: ${status}`);

        if (status === 'FINISHED') {
          break;
        } else if (status === 'ERROR') {
          throw new Error(`Instagram server failed to process Reel video: ${statusJson.error || 'Unknown error'}`);
        }
      }

      if (status !== 'FINISHED') {
        throw new Error(`Reel container processing timed out on Instagram servers.`);
      }

      // Publish the Reel container
      await db.log('PUBLISHER', `Publishing the Reel container to feed...`);
      const publishUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}/media_publish`;
      const responsePublish = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: facebookPageToken
        })
      });

      const resPublishJson = await responsePublish.json();
      if (!responsePublish.ok || !resPublishJson.id) {
        throw new Error(`Failed to publish Reel: ${JSON.stringify(resPublishJson)}`);
      }

      // Success! Update database
      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      post.instagramMediaId = resPublishJson.id;
      post.analytics = { reach: 0, shares: 0, saves: 0, likes: 0, comments: 0 };
      await db.savePost(post);

      await db.log('PUBLISHER', `Successfully published Reel ID "${postId}" to Instagram (Media ID: ${resPublishJson.id})`);
      return post;
    } else {
      const slideCount = post.slides ? post.slides.length : 1;
      
      if (slideCount === 1) {
        // Single Image Upload Flow
        const slidePath = path.join(absolutePostDir, `slide_1.png`);
        await db.log('PUBLISHER', `Uploading slide to temporary hosting for Instagram access...`);
        const publicUrl = await uploadToPublicHost(slidePath);
        await db.log('PUBLISHER', `Slide uploaded: ${publicUrl}`);

        await db.log('PUBLISHER', `Creating Instagram media container for single image...`);
        const containerUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}/media`;
        const response = await fetch(containerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: publicUrl,
            caption: `${post.caption}`,
            access_token: facebookPageToken
          })
        });

        const resJson = await response.json();
        if (!response.ok || !resJson.id) {
          throw new Error(`Failed to create single image container: ${JSON.stringify(resJson)}`);
        }
        const containerId = resJson.id;

        // Wait for container to process
        await db.log('PUBLISHER', `Waiting 5 seconds for Instagram to process the image container...`);
        await sleep(5000);

        // Publish
        await db.log('PUBLISHER', `Publishing the image container to feed...`);
        const publishUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}/media_publish`;
        const responsePublish = await fetch(publishUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: facebookPageToken
          })
        });

        const resPublishJson = await responsePublish.json();
        if (!responsePublish.ok || !resPublishJson.id) {
          throw new Error(`Failed to publish media: ${JSON.stringify(resPublishJson)}`);
        }

        // Success! Update database
        post.status = 'published';
        post.publishedAt = new Date().toISOString();
        post.instagramMediaId = resPublishJson.id;
        post.analytics = { reach: 0, shares: 0, saves: 0, likes: 0, comments: 0 };
        await db.savePost(post);

        await db.log('PUBLISHER', `Successfully published single image post ID "${postId}" to Instagram Feed (Media ID: ${resPublishJson.id})`);
        return post;
      } else {
        // Multi-Slide Carousel Upload Flow
        const publicUrls = [];
        for (let idx = 1; idx <= slideCount; idx++) {
          const slidePath = path.join(absolutePostDir, `slide_${idx}.png`);
          await db.log('PUBLISHER', `Uploading slide ${idx}/${slideCount} to temporary hosting for Instagram access...`);
          const publicUrl = await uploadToPublicHost(slidePath);
          publicUrls.push(publicUrl);
          await db.log('PUBLISHER', `Slide ${idx}/${slideCount} uploaded: ${publicUrl}`);
        }

        // Step 2: Create media container for each slide item
        const containerIds = [];
        for (let idx = 0; idx < publicUrls.length; idx++) {
          const imgUrl = publicUrls[idx];
          await db.log('PUBLISHER', `Creating Instagram media item container ${idx + 1}/${slideCount}...`);

          const containerUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}/media`;
          const response = await fetch(containerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: imgUrl,
              is_carousel_item: true,
              access_token: facebookPageToken
            })
          });

          const resJson = await response.json();
          if (!response.ok || !resJson.id) {
            throw new Error(`Failed to create slide container ${idx + 1}: ${JSON.stringify(resJson)}`);
          }
          containerIds.push(resJson.id);
        }

        // Step 3: Create carousel container enclosing slide containers
        await db.log('PUBLISHER', `Linking slide containers into a single Carousel container...`);
        const carouselContainerUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}/media`;
        const responseCarousel = await fetch(carouselContainerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'CAROUSEL',
            children: containerIds,
            caption: `${post.caption}`,
            access_token: facebookPageToken
          })
        });

        const resCarouselJson = await responseCarousel.json();
        if (!responseCarousel.ok || !resCarouselJson.id) {
          throw new Error(`Failed to create carousel container: ${JSON.stringify(resCarouselJson)}`);
        }
        const carouselId = resCarouselJson.id;

        // Step 4: Wait for containers to process on Instagram servers
        await db.log('PUBLISHER', `Waiting 8 seconds for Instagram to process the carousel containers...`);
        await sleep(8000);

        // Step 5: Publish the carousel container
        await db.log('PUBLISHER', `Publishing the carousel container to feed...`);
        const publishUrl = `https://graph.facebook.com/v19.0/${instagramBusinessId}/media_publish`;
        const responsePublish = await fetch(publishUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: carouselId,
            access_token: facebookPageToken
          })
        });

        const resPublishJson = await responsePublish.json();
        if (!responsePublish.ok || !resPublishJson.id) {
          throw new Error(`Failed to publish media: ${JSON.stringify(resPublishJson)}`);
        }

        // Success! Update database
        post.status = 'published';
        post.publishedAt = new Date().toISOString();
        post.instagramMediaId = resPublishJson.id;
        post.analytics = { reach: 0, shares: 0, saves: 0, likes: 0, comments: 0 };
        await db.savePost(post);

        await db.log('PUBLISHER', `Successfully published Carousel post ID "${postId}" to Instagram Feed (Media ID: ${resPublishJson.id})`);
        return post;
      }

      await db.log('PUBLISHER', `Successfully published post ID "${postId}" to Instagram Feed (Media ID: ${resPublishJson.id})`);
      return post;
    }
  } catch (error) {
    await db.log('ERROR', `Publication failed for post ID "${postId}": ${error.message}`);
    post.status = 'failed';
    await db.savePost(post);
    throw error;
  }
}

// Fetch insights for published posts
export async function syncPostAnalytics(postId) {
  const post = await db.getPost(postId);
  if (!post || post.status !== 'published' || !post.instagramMediaId) {
    return null;
  }

  const settings = await db.getSettings();
  const isSimulation = settings.isSimulationMode;

  if (isSimulation) {
    // Simulate slight daily growth in analytics
    const ageInHours = (new Date() - new Date(post.publishedAt)) / (1000 * 60 * 60);
    if (ageInHours > 0) {
      const growthFactor = Math.max(1, 48 - ageInHours) / 48; // Faster growth in first 48 hours
      post.analytics.likes += Math.floor(Math.random() * 15 * growthFactor);
      post.analytics.comments += Math.floor(Math.random() * 2 * growthFactor);
      post.analytics.saves += Math.floor(Math.random() * 8 * growthFactor);
      post.analytics.shares += Math.floor(Math.random() * 6 * growthFactor);
      post.analytics.reach += Math.floor(Math.random() * 50 * growthFactor);
      await db.savePost(post);
    }
    return post.analytics;
  }

  // Real Graph API query
  const { facebookPageToken } = settings;
  const mediaId = post.instagramMediaId;

  try {
    // Query likes, comments, and standard insights (reach, impressions, saved, shares)
    const statsUrl = `https://graph.facebook.com/v19.0/${mediaId}?fields=like_count,comments_count&access_token=${facebookPageToken}`;
    const responseStats = await fetch(statsUrl);
    const statsJson = await responseStats.json();

    const insightsUrl = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=reach,saved,shares&access_token=${facebookPageToken}`;
    const responseInsights = await fetch(insightsUrl);
    const insightsJson = await responseInsights.json();

    if (!responseStats.ok || !responseInsights.ok) {
      throw new Error(`Failed to retrieve stats/insights for media ID ${mediaId}`);
    }

    const likes = statsJson.like_count || 0;
    const comments = statsJson.comments_count || 0;

    let reach = 0;
    let saves = 0;
    let shares = 0;

    if (insightsJson.data) {
      const reachMetric = insightsJson.data.find(m => m.name === 'reach');
      const savedMetric = insightsJson.data.find(m => m.name === 'saved');
      const sharesMetric = insightsJson.data.find(m => m.name === 'shares');

      if (reachMetric && reachMetric.values) reach = reachMetric.values[0].value || 0;
      if (savedMetric && savedMetric.values) saves = savedMetric.values[0].value || 0;
      if (sharesMetric && sharesMetric.values) shares = sharesMetric.values[0].value || 0;
    }

    post.analytics = { reach, shares, saves, likes, comments };
    await db.savePost(post);
    return post.analytics;
  } catch (error) {
    console.error(`Failed to sync insights for post ${postId}:`, error);
    return null;
  }
}

export default {
  publishPostToInstagram,
  syncPostAnalytics
};
