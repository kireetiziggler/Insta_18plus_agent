import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { exec } from 'child_process';

import db from './services/db.js';
import scheduler from './services/scheduler.js';
import trendAgent from './services/trendAgent.js';
import generator from './services/generator.js';
import renderer from './services/renderer.js';
import publisher from './services/publisher.js';
import reels from './services/reels.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to run shell commands as promises
function runCmd(command) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

// Automatically pulls new posts/updates from GitHub
let isSyncing = false;
async function syncFromGitHub() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    await db.log('SYSTEM', 'Automatic synchronization: Checking for cloud updates from GitHub...');
    const result = await runCmd('git pull');
    if (result.error) {
      await db.log('ERROR', `Automatic git sync failed: ${result.error.message}`);
    } else {
      const output = result.stdout.trim();
      if (output.includes('Already up to date')) {
        await db.log('SYSTEM', 'Automatic synchronization: Local workspace is already up to date.');
      } else {
        await db.log('SYSTEM', `Automatic synchronization completed: ${output}`);
      }
    }
  } catch (err) {
    await db.log('ERROR', `Automatic git sync encountered error: ${err.message}`);
  } finally {
    isSyncing = false;
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Expose the generated slide images under /posts
app.use('/posts', express.static(path.join(__dirname, 'data', 'posts')));

// REST API Endpoints

// 1. Settings Endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updated = await db.updateSettings(req.body);
    // Reload scheduler in case cron times or configurations changed
    await scheduler.initScheduler();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Posts Endpoints
app.get('/api/posts', async (req, res) => {
  try {
    // Run git pull in background so it doesn't block page load
    syncFromGitHub();
    const posts = await db.getPosts();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await db.getPost(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger a new post draft generation based on category & optional trend topic
app.post('/api/posts', async (req, res) => {
  const { category, topic, type } = req.body;
  if (!category) return res.status(400).json({ error: 'Category is required' });

  try {
    const postId = (type === 'reel' ? 'reel_' : 'post_') + Date.now();

    if (type === 'reel') {
      await db.log('SYSTEM', `Manually requesting Reel generation for "${category}"...`);
      const newReel = await reels.generateReel(postId, category, topic);
      newReel.status = 'draft'; // Keep as draft initially for review
      await db.savePost(newReel);
      return res.status(201).json(newReel);
    }

    await db.log('SYSTEM', `Manually requesting post generation for "${category}"...`);
    const content = await generator.generatePostContent(category, topic);
    
    const newPost = {
      id: postId,
      category,
      backgroundTheme: content.backgroundTheme,
      slides: content.slides,
      caption: content.caption,
      scheduledFor: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // Draft 1 hour out
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    await db.savePost(newPost);
    
    // Render the slides immediately to create PNG files
    await db.log('SYSTEM', `Rendering slide graphics for manual draft "${postId}"...`);
    const renderedPaths = await renderer.renderPostSlides(postId, content.slides, content.backgroundTheme, category);
    newPost.renderedImages = renderedPaths;
    newPost.status = 'draft'; // Keep as draft
    await db.savePost(newPost);

    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a post (and automatically regenerate slides or compile Reel video if content or theme changed)
app.put('/api/posts/:id', async (req, res) => {
  try {
    const existingPost = await db.getPost(req.params.id);
    if (!existingPost) return res.status(404).json({ error: 'Post not found' });

    const updatedData = req.body;
    const isReel = existingPost.type === 'reel';
    
    let mergedPost = { ...existingPost, ...updatedData };

    if (isReel) {
      // Detect changes in Reel parameters
      const titleChanged = existingPost.titleText !== updatedData.titleText;
      const themeChanged = existingPost.backgroundTheme !== updatedData.backgroundTheme;
      const audioChanged = existingPost.audioScript !== updatedData.audioScript;

      if (titleChanged || themeChanged || audioChanged) {
        await db.log('SYSTEM', `Detected changes in Reel "${req.params.id}". Re-compiling video assets...`);
        const assets = await reels.compileReel(
          mergedPost.id,
          mergedPost.titleText,
          mergedPost.backgroundTheme,
          mergedPost.category,
          mergedPost.audioScript
        );
        mergedPost = { ...mergedPost, ...assets };
      }
    } else {
      // Detect changes in slides or theme to re-render graphics
      const slidesChanged = JSON.stringify(existingPost.slides) !== JSON.stringify(updatedData.slides);
      const themeChanged = existingPost.backgroundTheme !== updatedData.backgroundTheme;

      if (slidesChanged || themeChanged) {
        await db.log('SYSTEM', `Detected slide text or theme change on post "${req.params.id}". Re-rendering PNG graphics...`);
        const renderedPaths = await renderer.renderPostSlides(
          mergedPost.id, 
          mergedPost.slides, 
          mergedPost.backgroundTheme, 
          mergedPost.category
        );
        mergedPost.renderedImages = renderedPaths;
      }
    }

    await db.savePost(mergedPost);
    res.json(mergedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const success = await db.deletePost(req.params.id);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger publishing of a post to Instagram immediately (overriding schedule)
app.post('/api/posts/:id/publish', async (req, res) => {
  try {
    const post = await publisher.publishPostToInstagram(req.params.id);
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Trends Endpoints
app.get('/api/trends', async (req, res) => {
  try {
    const trends = await db.getTrends();
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trends/research', async (req, res) => {
  try {
    const trends = await trendAgent.runTrendResearch();
    res.json({ success: true, trendsCount: trends.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Logs Endpoints
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await db.getLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logs/clear', async (req, res) => {
  try {
    await db.clearLogs();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend build in production
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
  // If request is not API, serve React index.html
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/posts/')) {
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) {
        // Dev fallback if client isn't built yet
        res.status(200).send('Unspoken Desires API running. UI client dist directory not built yet. Run the frontend in dev mode or build the app.');
      }
    });
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

// Start Server and Initialize Schedule
app.listen(PORT, async () => {
  console.log(`Unspoken Desires Server running on http://localhost:${PORT}`);
  try {
    await db.log('SYSTEM', `Unspoken Desires server starting up on port ${PORT}...`);
    // Pull latest posts from GitHub on startup
    await syncFromGitHub();
    await scheduler.initScheduler();
  } catch (e) {
    console.error('Failed to initialize scheduler during startup:', e);
  }
});
