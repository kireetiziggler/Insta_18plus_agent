import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../services/db.js';
import generator from '../services/generator.js';
import renderer from '../services/renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_DIR = 'C:/Users/kiree/.gemini/antigravity/brain/11fd77fa-f686-4b82-83db-9dc123b5eda6';

async function run() {
  console.log('Starting sample generation and rendering after updates...');
  
  // Ensure the settings are loaded
  const settings = await db.getSettings();
  console.log(`Settings loaded. Page handle: ${settings.pageHandle}`);

  // 1. Generate & Render Morning Slot
  console.log('\n--- Generating Morning Slot: Anonymous Confessions ---');
  const morningContent = await generator.generatePostContent('Anonymous Confessions');
  console.log('Generated content:');
  console.log(`Theme: ${morningContent.backgroundTheme}`);
  console.log(`Query: ${morningContent.pexelsQuery}`);
  console.log(`Slide: "${morningContent.slides[0]}"`);
  console.log(`Caption: "${morningContent.caption}"`);

  const morningPostId = 'test_sample_morning_run';
  const morningPostDir = path.join(__dirname, '..', 'data', 'posts', morningPostId);
  
  // Create morning post directory and copy the AI-generated image to background.png
  await fs.mkdir(morningPostDir, { recursive: true });
  const generatedImgPath = path.join(ARTIFACTS_DIR, 'whisper_secret_night_1781450018568.png');
  await fs.copyFile(generatedImgPath, path.join(morningPostDir, 'background.png'));
  console.log(`Pre-loaded generated image to ${path.join(morningPostDir, 'background.png')}`);
  
  // Render slide
  const morningImages = await renderer.renderPostSlides(
    morningPostId,
    morningContent.slides,
    morningContent.backgroundTheme,
    'Anonymous Confessions',
    morningContent.pexelsQuery
  );
  
  // Copy to artifacts
  const morningSrcPath = path.join(__dirname, '..', 'data', 'posts', morningPostId, 'slide_1.png');
  const morningDstPath = path.join(ARTIFACTS_DIR, 'sample_after_update_morning.png');
  await fs.copyFile(morningSrcPath, morningDstPath);
  console.log(`Morning slide copied to: ${morningDstPath}`);

  // 2. Generate & Render Evening Slot
  console.log('\n--- Generating Evening Slot: Intimate Secrets ---');
  const eveningContent = await generator.generatePostContent('Intimate Secrets');
  console.log('Generated content:');
  console.log(`Theme: ${eveningContent.backgroundTheme}`);
  console.log(`Query: ${eveningContent.pexelsQuery}`);
  console.log(`Slide: "${eveningContent.slides[0]}"`);
  console.log(`Caption: "${eveningContent.caption}"`);

  const eveningPostId = 'test_sample_evening_run';
  const eveningPostDir = path.join(__dirname, '..', 'data', 'posts', eveningPostId);
  
  // Render slide
  const eveningImages = await renderer.renderPostSlides(
    eveningPostId,
    eveningContent.slides,
    eveningContent.backgroundTheme,
    'Intimate Secrets',
    eveningContent.pexelsQuery
  );
  
  // Copy to artifacts
  const eveningSrcPath = path.join(__dirname, '..', 'data', 'posts', eveningPostId, 'slide_1.png');
  const eveningDstPath = path.join(ARTIFACTS_DIR, 'sample_after_update_evening.png');
  await fs.copyFile(eveningSrcPath, eveningDstPath);
  console.log(`Evening slide copied to: ${eveningDstPath}`);

  // 3. Update sample_posts.md with the generated details
  console.log('\nUpdating sample_posts.md...');
  const mdContent = `# Generated Sample Posts (@unspokendesireshub Dark & Suggestive HD Layout)

Here are the 2 actual sample posts generated and rendered using the refined \`@unspokendesireshub\` visual layout and suggestive guidelines. These feature Ultra-HD (2160x2700) backdrop crops, a bottom-aligned glassmorphic text container for absolute legibility on any background image, a dark night-vibe filter (brightness reduced to 0.48), and watermark branding size increased by +5%.

---

## 1. Morning Slot: Anonymous Confessions (Intimacy/Jealousy Focus)

### Rendered Slide
![Morning Slide](file:///C:/Users/kiree/.gemini/antigravity/brain/11fd77fa-f686-4b82-83db-9dc123b5eda6/sample_after_update_morning.png)

### Copy Details
* **Category:** Anonymous Confessions
* **Background Theme:** \`${morningContent.backgroundTheme}\` (Searched Pexels dynamic query: \`"${morningContent.pexelsQuery}"\`)
* **Resolution**: Ultra-HD 2160x2700 crop (with 0.48 brightness filter applied)
* **Slide Text:**
  > "${morningContent.slides[0]}"
* **Caption:**
  > "${morningContent.caption}"

---

## 2. Evening Slot: Intimate Secrets (Jealousy/Long-Distance Focus)

### Rendered Slide
![Evening Slide](file:///C:/Users/kiree/.gemini/antigravity/brain/11fd77fa-f686-4b82-83db-9dc123b5eda6/sample_after_update_evening.png)

### Copy Details
* **Category:** Intimate Secrets
* **Background Theme:** \`${eveningContent.backgroundTheme}\` (Searched Pexels dynamic query: \`"${eveningContent.pexelsQuery}"\`)
* **Resolution**: Ultra-HD 2160x2700 crop (with 0.48 brightness filter applied)
* **Slide Text:**
  > "${eveningContent.slides[0]}"
* **Caption:**
  > "${eveningContent.caption}"
`;

  const mdPath = path.join(ARTIFACTS_DIR, 'sample_posts.md');
  await fs.writeFile(mdPath, mdContent, 'utf-8');
  console.log(`sample_posts.md updated successfully.`);

  // Clean up post dirs
  await fs.rm(morningPostDir, { recursive: true, force: true });
  await fs.rm(eveningPostDir, { recursive: true, force: true });
  console.log('Cleaned up temporary rendering folders.');
}

run().catch(err => {
  console.error('Error running test script:', err);
});
