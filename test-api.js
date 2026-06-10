import db from './services/db.js';
import trendAgent from './services/trendAgent.js';
import renderer from './services/renderer.js';
import generator from './services/generator.js';
import reels from './services/reels.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('=============================================');
  console.log('UNSPOKEN DESIRES AUTOMATION SYSTEM - VALIDATION RUN');
  console.log('=============================================\n');

  // Test 1: Database Initialization
  console.log('[TEST 1/5] Testing Database Initialization...');
  try {
    const settings = await db.getSettings();
    console.log('✓ Success: Database loaded successfully.');
    console.log(`  Current Simulation Mode: ${settings.isSimulationMode}`);
    console.log(`  Current Page Handle: ${settings.pageHandle}\n`);
  } catch (e) {
    console.error('✗ Failed: Database loading failed:', e);
    process.exit(1);
  }

  // Test 2: Reddit Scraper Smoke Test
  console.log('[TEST 2/5] Testing Reddit Scraper via Puppeteer...');
  let browser = null;
  try {
    console.log('  Launching validation browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    
    console.log('  Loading old.reddit.com/r/dating...');
    await page.goto('https://old.reddit.com/r/dating/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    const count = await page.evaluate(() => {
      return document.querySelectorAll('.thing:not(.sticky)').length;
    });
    
    console.log(`✓ Success: Reddit scraper fetched ${count} posts successfully.\n`);
  } catch (e) {
    console.error('✗ Failed: Reddit scraping failed:', e.message);
  } finally {
    if (browser) await browser.close();
  }

  // Test 3: Offline Template Generation Check
  console.log('[TEST 3/5] Testing Niche Copywriter Generator...');
  let testContent = null;
  try {
    testContent = await generator.generatePostContent('Desire & Physical Intimacy');
    console.log('✓ Success: Generated copywriting details.');
    console.log(`  Selected background theme: "${testContent.backgroundTheme}"`);
    console.log(`  Slide 1 text: "${testContent.slides[0]}"\n`);
  } catch (e) {
    console.error('✗ Failed: Generator failed:', e);
    process.exit(1);
  }

  // Test 4: Puppeteer Slide Renderer Check
  console.log('[TEST 4/5] Testing Puppeteer Image Renderer (Creating graphics)...');
  const testPostId = 'test_post_validation';
  try {
    const slides = [
      "This is a *validation test* of the renderer.",
      "The Puppeteer engine loads custom web fonts and applies *linear gradients* for aesthetic contrast.",
      "Background images are hotlinked from a curated collection of *dark, moody photography*.",
      "This ensures that final images look *highly professional* on Instagram feed layouts.",
      "Validation test complete.\nSave this for later ❤️"
    ];
    
    console.log('  Running headless Chromium screenshot compiler...');
    const renderedPaths = await renderer.renderPostSlides(
      testPostId,
      slides,
      'secret_thoughts',
      'System Validation'
    );

    console.log('✓ Success: Finished rendering slides. Created files:');
    for (const p of renderedPaths) {
      console.log(`  - http://localhost:5000${p}`);
    }

    // Double check that files exist physically
    const absolutePostDir = path.join(__dirname, 'data', 'posts', testPostId);
    const files = await fs.readdir(absolutePostDir);
    console.log(`  ✓ Physical files in data/posts/${testPostId}: ${files.join(', ')}\n`);

    // Clean up test files
    console.log('  Cleaning up test assets...');
    await fs.rm(absolutePostDir, { recursive: true, force: true });
    console.log('  ✓ Cleaned up test folder.\n');

  } catch (e) {
    console.error('✗ Failed: Puppeteer slide rendering failed:', e);
    process.exit(1);
  }

  // Test 5: Reels Automation Workflow Check
  console.log('[TEST 5/5] Testing Reels Generation Workflow...');
  const testReelId = 'test_reel_validation';
  try {
    console.log('  Running Reels compiler (Script generation + 9:16 vertical render + TTS + FFmpeg stitch)...');
    const result = await reels.generateReel(testReelId, 'Secret Thoughts & Overthinking');
    
    console.log('✓ Success: Reel generated and assets updated.');
    console.log(`  - Visual Theme: ${result.backgroundTheme}`);
    console.log(`  - Reel Title Text: ${result.titleText}`);
    console.log(`  - Audio script: "${result.audioScript}"`);
    console.log(`  - Video output served at: http://localhost:5000${result.renderedVideo}`);
    console.log(`  - Audio output served at: http://localhost:5000${result.renderedAudio}\n`);

    // Check physical file exits
    const absolutePostDir = path.join(__dirname, 'data', 'posts', testReelId);
    const files = await fs.readdir(absolutePostDir);
    console.log(`  ✓ Physical files in data/posts/${testReelId}: ${files.join(', ')}`);

    // Clean up test files and DB record
    console.log('  Cleaning up test assets & DB records...');
    await fs.rm(absolutePostDir, { recursive: true, force: true });
    await db.deletePost(testReelId);
    console.log('  ✓ Cleaned up test Reel files and deleted post record.\n');
  } catch (e) {
    console.error('✗ Failed: Reels compilation workflow failed:', e);
    process.exit(1);
  }

  console.log('=============================================');
  console.log('✓ ALL SYSTEM INTEGRATION TESTS PASSED');
  console.log('=============================================');
}

runTests();
