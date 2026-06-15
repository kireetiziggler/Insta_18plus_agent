import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db from '../services/db.js';
import renderer from '../services/renderer.js';
import publisher from '../services/publisher.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_DIR = 'C:/Users/kiree/.gemini/antigravity/brain/11fd77fa-f686-4b82-83db-9dc123b5eda6';

async function run() {
  console.log('Initiating publication of the morning slide to Instagram...');

  const settings = await db.getSettings();
  console.log(`Settings initialized. Simulation mode: ${settings.isSimulationMode}`);

  const postId = `post_${Date.now()}`;
  const category = 'Anonymous Confessions';
  const backgroundTheme = 'secret_thoughts';
  const slides = [
    "He sent a voice note describing exactly what he’d do to me if he weren't three thousand miles away. Now I'm staring at the ceiling in the dark, my body aching for a touch that isn't here. Have you felt this? ❦"
  ];
  const caption = "Distance makes the craving so much worse. How do you handle long distance desire? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage";

  const postDir = path.join(__dirname, '..', 'data', 'posts', postId);
  await fs.mkdir(postDir, { recursive: true });

  // 1. Copy the AI-generated background image
  const aiImgPath = path.join(ARTIFACTS_DIR, 'whisper_secret_night_1781450018568.png');
  const bgPath = path.join(postDir, 'background.png');
  await fs.copyFile(aiImgPath, bgPath);
  console.log(`Copied AI generated background image to ${bgPath}`);

  // 2. Save Draft Post
  const newPost = {
    id: postId,
    category,
    backgroundTheme,
    pexelsQuery: 'custom_ai_generated',
    slides,
    caption,
    scheduledFor: new Date().toISOString(),
    status: 'draft',
    createdAt: new Date().toISOString()
  };
  await db.savePost(newPost);
  console.log(`Saved draft post ${postId} to database.`);

  // 3. Render slide
  console.log('Rendering slides using Puppeteer...');
  const renderedPaths = await renderer.renderPostSlides(
    postId,
    slides,
    backgroundTheme,
    category,
    'custom_ai_generated'
  );

  newPost.renderedImages = renderedPaths;
  newPost.status = 'scheduled';
  await db.savePost(newPost);
  console.log(`Slide rendering finished. File paths: ${renderedPaths.join(', ')}`);

  // 4. Publish to Instagram
  console.log('Publishing post to Instagram page...');
  const publishedPost = await publisher.publishPostToInstagram(postId);
  console.log(`✓ Success: Published post ${postId} successfully!`);
  console.log(`Instagram Media ID: ${publishedPost.instagramMediaId}`);
}

run().catch(err => {
  console.error('Error executing publishing script:', err);
  process.exit(1);
});
