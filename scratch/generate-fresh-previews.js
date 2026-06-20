import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../services/db.js';
import { renderPostSlides } from '../services/renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_DIR = 'C:\\Users\\kiree\\.gemini\\antigravity\\brain\\11fd77fa-f686-4b82-83db-9dc123b5eda6';

const FRESH_POSTS = [
  {
    category: 'Anonymous Confessions',
    suffix: 'morning',
    themeName: 'midnight_desire',
    query: 'kitchen counter couple romantic tension night low light shadow silhouette',
    slides: [
      `"Kitchen Counter Sins"\n\nIt was 3 AM, and the kitchen was only lit by the open refrigerator door.\nI was sitting on the counter, and he walked in, stopping right between my knees.\n\n"You should be in bed," he murmured, his voice thick with sleep.\n\n"I couldn't sleep," I whispered, tracing the collar of his t-shirt.\nHe didn't reply. He just leaned in, pressing his warm lips to the hollow of my throat until I forgot how to breathe.`
    ],
    caption: 'Midnight cravings that have nothing to do with food. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage'
  },
  {
    category: 'Intimate Secrets',
    suffix: 'evening',
    themeName: 'rainy_bed',
    query: 'car backseat couple intimacy rain city lights night reflection bokeh shadow',
    slides: [
      `"Rain-Slicked Backseat"\n\nThe steam from our breath had completely fogged up the windows.\nHe reached up, drawing a small heart in the condensation, his eyes never leaving mine.\n\n"Tell me to stop," he whispered, his hand sliding slowly up my thigh.\n\nI held my breath, gripping his shoulders as the city lights blurred outside.\nI couldn't say it. And we both knew we weren't going back.`
    ],
    caption: 'Some lines are meant to be crossed in the dark. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage'
  }
];

async function generateSample(postData) {
  console.log(`\n--- Generating Fresh Custom Sample: "${postData.category}" ---`);
  
  const postId = `sample_post_after_update_${postData.suffix}_${Date.now()}`;
  const newPost = {
    id: postId,
    category: postData.category,
    backgroundTheme: postData.themeName,
    slides: postData.slides,
    caption: postData.caption,
    scheduledFor: new Date().toISOString(),
    status: 'draft',
    createdAt: new Date().toISOString()
  };
  
  await db.savePost(newPost);
  console.log(`Saved fresh draft post to database: "${postId}"`);

  // Render slides using the new Pollinations.ai renderer flow
  // Pass postData.query to force the specific prompt
  console.log('Rendering graphics using Pollinations.ai...');
  const renderedPaths = await renderPostSlides(postId, postData.slides, postData.themeName, postData.category, postData.query);
  
  newPost.renderedImages = renderedPaths;
  await db.savePost(newPost);
  console.log(`Graphics rendered: ${JSON.stringify(renderedPaths)}`);

  // Copy the rendered slide image to artifacts
  const sourcePath = path.join(__dirname, '..', 'data', 'posts', postId, 'slide_1.png');
  const destPath = path.join(ARTIFACTS_DIR, `sample_after_update_${postData.suffix}.png`);
  
  try {
    await fs.copyFile(sourcePath, destPath);
    console.log(`Copied slide to artifact path: ${destPath}`);
  } catch (err) {
    console.error(`Failed to copy slide to artifacts: ${err.message}`);
  }
}

async function main() {
  // Clear any old logs to make checkouts clean
  console.log('Generating fresh, unique AI-narrative dialogue samples for user approval...');
  for (const post of FRESH_POSTS) {
    await generateSample(post);
  }
  console.log('\nAll fresh custom samples generated successfully!');
}

main().catch(err => {
  console.error('Error running fresh sample generation:', err);
});
