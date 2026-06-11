import db from '../services/db.js';
import generator from '../services/generator.js';
import renderer from '../services/renderer.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('Generating sample post for "Unspoken Desires"...');
  
  const postId = 'sample_post_' + Date.now();
  const category = 'Desire & Physical Intimacy';
  const topic = 'physical chemistry';
  
  // 1. Generate post content
  const content = await generator.generatePostContent(category, topic);
  console.log('Generated content structure:', JSON.stringify(content, null, 2));
  
  // 2. Render slides
  console.log('Rendering slides...');
  const renderedPaths = await renderer.renderPostSlides(postId, content.slides, content.backgroundTheme, category);
  console.log('Rendered slide paths:', renderedPaths);
  
  // 3. Copy first slide to artifacts directory
  const slide1Path = path.join(__dirname, '..', 'data', 'posts', postId, 'slide_1.png');
  const artifactDest = 'C:/Users/kiree/.gemini/antigravity/brain/11fd77fa-f686-4b82-83db-9dc123b5eda6/unspoken_desires_sample.png';
  
  await fs.copyFile(slide1Path, artifactDest);
  console.log(`Copied slide_1.png to artifacts directory at ${artifactDest}`);
}

run().catch(console.error);
