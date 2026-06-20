import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../services/db.js';
import { generatePostContent } from '../services/generator.js';
import { renderPostSlides } from '../services/renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_DIR = 'C:\\Users\\kiree\\.gemini\\antigravity\\brain\\11fd77fa-f686-4b82-83db-9dc123b5eda6';

async function generateSample(category, suffix) {
  console.log(`\n--- Generating Sample for Category: "${category}" ---`);
  
  // 1. Generate content using the actual generator services
  const content = await generatePostContent(category);
  console.log(`Content generated successfully. Theme chosen: "${content.backgroundTheme}"`);
  console.log(`Slide Text: "${content.slides[0]}"`);
  console.log(`Caption: "${content.caption}"`);

  // 2. Save to database as a sample/draft post
  const postId = `sample_post_after_update_${suffix}_${Date.now()}`;
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
  console.log(`Saved draft post to database with ID: "${postId}"`);

  // 3. Render slide graphics using Puppeteer
  console.log('Rendering graphics...');
  const renderedPaths = await renderPostSlides(postId, content.slides, content.backgroundTheme, category);
  
  newPost.renderedImages = renderedPaths;
  await db.savePost(newPost);
  console.log(`Graphics rendered: ${JSON.stringify(renderedPaths)}`);

  // 4. Copy the rendered slide image to the artifacts directory so the user can view it
  const sourcePath = path.join(__dirname, '..', 'data', 'posts', postId, 'slide_1.png');
  const destPath = path.join(ARTIFACTS_DIR, `sample_after_update_${suffix}.png`);
  
  try {
    await fs.copyFile(sourcePath, destPath);
    console.log(`Copied slide to artifact path: ${destPath}`);
  } catch (err) {
    console.error(`Failed to copy slide to artifacts: ${err.message}`);
  }
}

async function main() {
  await generateSample('Anonymous Confessions', 'morning');
  await generateSample('Intimate Secrets', 'evening');
  console.log('\nBoth samples generated and rendered successfully!');
}

main().catch(err => {
  console.error('Error running sample generation:', err);
});
