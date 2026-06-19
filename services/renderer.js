import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STYLE_THEMES = {
  0: { // Sunday: deep_midnight
    name: 'deep_midnight',
    fontImport: '@import url("https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@400;600;800&display=swap");',
    bodyFont: "'Lora', serif",
    accentColor: '#60a5fa', // Soft blue
    bgFilter: 'brightness(0.5) saturate(0.85)',
    customCSS: `
      .quote-body-container { border-left: 2px solid rgba(96, 165, 250, 0.4); }
      .highlight { color: #60a5fa; font-style: italic; }
      .brand-logo-watermark { border-color: rgba(96, 165, 250, 0.4); color: #60a5fa; }
    `
  },
  1: { // Monday: crimson_secrets
    name: 'crimson_secrets',
    fontImport: '@import url("https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@400;600;800&display=swap");',
    bodyFont: "'Lora', serif",
    accentColor: '#f87171', // Crimson red
    bgFilter: 'brightness(0.48) saturate(0.95)',
    customCSS: `
      .quote-body-container { border-left: 2px solid rgba(248, 113, 113, 0.4); }
      .highlight { color: #f87171; font-style: italic; }
      .brand-logo-watermark { border-color: rgba(248, 113, 113, 0.4); color: #f87171; }
    `
  },
  2: { // Tuesday: silk_gold
    name: 'silk_gold',
    fontImport: '@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap");',
    bodyFont: "'Outfit', sans-serif",
    accentColor: '#fbbf24', // Luxury gold
    bgFilter: 'brightness(0.5) sepia(0.12)',
    customCSS: `
      .quote-body-container { border-left: 2px solid rgba(251, 191, 36, 0.4); }
      .highlight { color: #fbbf24; font-weight: 700; }
      .brand-logo-watermark { border-color: rgba(251, 191, 36, 0.4); color: #fbbf24; }
    `
  },
  3: { // Wednesday: shadowy_passion
    name: 'shadowy_passion',
    fontImport: '@import url("https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@400;600;800&display=swap");',
    bodyFont: "'Lora', serif",
    accentColor: '#fb7185', // Dark rose
    bgFilter: 'brightness(0.48) saturate(0.9)',
    customCSS: `
      .quote-body-container { border-left: 2px solid rgba(251, 113, 133, 0.4); }
      .highlight { color: #fb7185; font-style: italic; }
      .brand-logo-watermark { border-color: rgba(251, 113, 133, 0.4); color: #fb7185; }
    `
  },
  4: { // Thursday: obsidian_black
    name: 'obsidian_black',
    fontImport: '@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap");',
    bodyFont: "'Outfit', sans-serif",
    accentColor: '#ffffff', // High contrast white
    bgFilter: 'brightness(0.42) grayscale(0.4)',
    customCSS: `
      .quote-body-container { border-left: 2px solid rgba(255, 255, 255, 0.5); }
      .highlight { color: #ffffff; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.4); }
      .brand-logo-watermark { border-color: rgba(255, 255, 255, 0.5); color: #ffffff; }
    `
  },
  5: { // Friday: crimson_secrets
    name: 'crimson_secrets',
    fontImport: '@import url("https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@400;600;800&display=swap");',
    bodyFont: "'Lora', serif",
    accentColor: '#f87171',
    bgFilter: 'brightness(0.48) saturate(0.95)',
    customCSS: `
      .quote-body-container { border-left: 2px solid rgba(248, 113, 113, 0.4); }
      .highlight { color: #f87171; font-style: italic; }
      .brand-logo-watermark { border-color: rgba(248, 113, 113, 0.4); color: #f87171; }
    `
  },
  6: { // Saturday: silk_gold
    name: 'silk_gold',
    fontImport: '@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap");',
    bodyFont: "'Outfit', sans-serif",
    accentColor: '#fbbf24',
    bgFilter: 'brightness(0.5) sepia(0.12)',
    customCSS: `
      .quote-body-container { border-left: 2px solid rgba(251, 191, 36, 0.4); }
      .highlight { color: #fbbf24; font-weight: 700; }
      .brand-logo-watermark { border-color: rgba(251, 191, 36, 0.4); color: #fbbf24; }
    `
  }
};

// Map themes to local backdrop filenames
const THEME_IMAGES = {
  midnight_desire: 'midnight_desire',
  rainy_bed: 'rainy_bed',
  shadowy_lounge: 'shadowy_lounge',
  candlelight_secrets: 'candlelight_secrets',
  intimate_touch: 'intimate_touch',
  overthinking_night: 'overthinking_night',
  secret_thoughts: 'secret_thoughts',
  sensual_vibes: 'sensual_vibes'
};

// Parser to convert *word* into gradient highlight blocks
function parseFormatting(text) {
  if (!text) return '';
  // Replace **text** or *text* with gradient highlighted text span
  return text
    .replace(/\*\*(.*?)\*\*/g, '<span class="highlight">$1</span>')
    .replace(/\*(.*?)\*/g, '<span class="highlight">$1</span>')
    .replace(/\n/g, '<br/>');
}

// Generate the HTML content string for a slide matching the user's premium reference image
function generateSlideHTML(slideText, slideIndex, themeName, handle, categoryName, theme, logoBase64, bgBase64) {
  const bgDataUrl = `data:image/png;base64,${bgBase64}`;
  const logoDataUrl = `data:image/png;base64,${logoBase64}`;
  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;

  // Split into lines to extract title and paragraphs
  const lines = slideText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let titleHTML = '';
  let bodyHTML = '';

  const firstLine = lines[0] || '';
  const titleMatch = firstLine.match(/^[“"\"'](.*?)[”"\"']$/);

  if (titleMatch && firstLine.length < 45) {
    const titleText = titleMatch[1];
    titleHTML = `<h2 class="confession-title">“${titleText}”</h2>`;
    const bodyLines = lines.slice(1).map(line => parseFormatting(line));
    bodyHTML = bodyLines.map(line => `<p class="confession-paragraph">${line}</p>`).join('');
  } else {
    const bodyLines = lines.map(line => parseFormatting(line));
    bodyHTML = bodyLines.map(line => `<p class="confession-paragraph">${line}</p>`).join('');
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Slide Render</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  ${theme.fontImport || ''}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 1080px;
      height: 1080px;
      overflow: hidden;
      background-color: #050507;
      font-family: 'Lora', serif;
    }
    #slide-container {
      width: 1080px;
      height: 1080px;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 95px 90px;
      color: #fff;
      z-index: 5;
    }
    .bg-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 1080px;
      height: 1080px;
      background-image: url('${bgDataUrl}');
      background-size: cover;
      background-position: center;
      /* Moody night/low-light background filter to make text pop */
      filter: brightness(0.38) contrast(1.05) saturate(0.85);
      z-index: 1;
    }
    .bg-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 1080px;
      height: 1080px;
      background: rgba(5, 5, 7, 0.22);
      z-index: 2;
    }
    
    .brand-watermark {
      position: absolute;
      bottom: 65px;
      right: 90px;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 15px;
      opacity: 0.85;
    }
    .brand-logo-img {
      height: 42px;
      width: auto;
      object-fit: contain;
    }
    .brand-handle {
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.9);
      text-transform: uppercase;
    }
    
    /* Centered text container with premium dark glassmorphism for contrast */
    .quote-section {
      z-index: 10;
      max-width: 900px;
      width: calc(100% - 180px);
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.42);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      padding: 45px 55px;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .confession-title {
      font-family: ${theme.bodyFont || "'Lora', serif"};
      font-size: 44px;
      font-weight: 700;
      color: ${theme.accentColor || '#fbbf24'};
      text-align: left;
      margin-bottom: 5px;
      font-style: italic;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
    }
    
    .confession-paragraph {
      font-family: ${theme.bodyFont || "'Lora', serif"};
      font-size: 34px;
      line-height: 1.6;
      color: #ffffff;
      font-weight: 400;
      text-align: left;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
    }
    
    .confession-paragraph:last-child {
      font-weight: 500;
    }
    
    .highlight {
      color: ${theme.accentColor || '#fbbf24'};
      font-weight: 700;
    }
    
    ${theme.customCSS || ''}
  </style>
</head>
<body>
  <div class="bg-image"></div>
  <div class="bg-overlay"></div>
  
  <div id="slide-container">
    <div class="quote-section">
      ${titleHTML}
      ${bodyHTML}
    </div>
    
    <div class="brand-watermark">
      <span class="brand-handle">${cleanHandle}</span>
      <img class="brand-logo-img" src="${logoDataUrl}" alt="Logo" />
    </div>
  </div>
</body>
</html>
  `;
}

async function downloadBackgroundImage(themeName, postDir, pexelsQuery = null) {
  const targetPath = path.join(postDir, 'background.png');
  
  try {
    await fs.access(targetPath);
    await db.log('SYSTEM', `Using existing background image for this post: ${targetPath}`);
    return targetPath;
  } catch (e) {
    // Proceed to search & download
  }

  // Map each theme to a unique, stunning visual background theme query
  const PEXELS_THEME_QUERIES = {
    midnight_desire: 'couples intimate candle light shadow silhouette dark low light',
    rainy_bed: 'cozy dark bedroom night rain street lights window bedroom',
    shadowy_lounge: 'shadowy bar night couple romantic tension low light',
    candlelight_secrets: 'hands touch candle light night table aesthetic dark romantic',
    intimate_touch: 'gentle touch embrace shadow couple intimacy body low light night',
    overthinking_night: 'person look window night city neon lights lonely shadow',
    secret_thoughts: 'person sit silk bed phone screen night bedroom dark glow',
    sensual_vibes: 'crimson gold luxury silk abstract dark light texture red'
  };

  const query = pexelsQuery || PEXELS_THEME_QUERIES[themeName] || 'romantic couple shadow intimacy';
  
  // Construct a styled, high-quality cinematic prompt for Pollinations.ai
  const styledPrompt = `${query}, highly sensual, romantic couple, cinematic lighting, dark atmosphere, moody shadows, low light, photorealistic, 8k resolution, premium aesthetics, intimate, no text, no watermark`;
  const seed = Math.floor(Math.random() * 1000000000);
  const downloadUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(styledPrompt)}?width=1080&height=1080&nologo=true&seed=${seed}`;

  await db.log('SYSTEM', `Generating unique AI background image using Pollinations.ai. Prompt: "${query}" (Seed: ${seed})`);
  await db.log('SYSTEM', `Downloading from Pollinations: ${downloadUrl}`);

  try {
    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error(`Pollinations API returned status ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(targetPath, buffer);
    await db.log('SYSTEM', `Successfully downloaded generated background image to ${targetPath}`);
    return targetPath;
  } catch (err) {
    await db.log('ERROR', `Failed to generate or download background image from Pollinations: ${err.message}`);
  }

  return null;
}

// Launches a headless Chrome via Puppeteer and renders the slides to disk
export async function renderPostSlides(postId, slides, themeName, categoryName, pexelsQuery = null) {
  const settings = await db.getSettings();
  const handle = settings.pageHandle || '@auraflow.co';
  const postDir = path.join(__dirname, '..', 'data', 'posts', postId);
  
  // Ensure the specific post target directory exists
  await fs.mkdir(postDir, { recursive: true });
  await db.log('SYSTEM', `Creating slide directory: "${postDir}"`);

  // Look up post scheduled date to determine its styling theme
  let dayOfWeek = new Date().getDay();
  try {
    const post = await db.getPost(postId);
    if (post && post.scheduledFor) {
      dayOfWeek = new Date(post.scheduledFor).getDay();
    }
  } catch (err) {
    // Ignore and fallback to today
  }
  const theme = STYLE_THEMES[dayOfWeek] || STYLE_THEMES[3];
  await db.log('SYSTEM', `Applying daily visual theme: "${theme.name}" (Day of week: ${dayOfWeek})`);

  // Load logo as base64
  const logoPath = path.join(__dirname, '..', 'data', 'logo.png');
  let logoBase64 = '';
  try {
    logoBase64 = await fs.readFile(logoPath, 'base64');
  } catch (err) {
    await db.log('ERROR', `Failed to load logo image: ${err.message}`);
  }

  // Load background as base64 (either downloaded custom background or local fallback)
  let bgBase64 = '';
  let customBgPath = null;
  try {
    customBgPath = await downloadBackgroundImage(themeName, postDir, pexelsQuery);
  } catch (err) {
    await db.log('ERROR', `Failed to download custom background: ${err.message}`);
  }

  const bgFullPath = customBgPath || path.join(__dirname, '..', 'data', 'backgrounds', `${THEME_IMAGES[themeName] || 'sensual_vibes'}.png`);
  try {
    bgBase64 = await fs.readFile(bgFullPath, 'base64');
  } catch (err) {
    await db.log('ERROR', `Failed to load background image: ${err.message}`);
  }

  let browser = null;
  try {
    await db.log('SYSTEM', `Launching Puppeteer browser instance...`);
    const executablePath = process.platform === 'linux' ? '/usr/bin/google-chrome' : undefined;
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 }); // Scale factor 2 for crisp text

    const renderedPaths = [];

    for (let idx = 0; idx < slides.length; idx++) {
      const slideText = slides[idx];
      const htmlContent = generateSlideHTML(slideText, idx, themeName, handle, categoryName, theme, logoBase64, bgBase64);
      
      await db.log('SYSTEM', `Rendering slide ${idx + 1}/${slides.length}...`);
      await page.setContent(htmlContent, { waitUntil: 'load' });
      
      // Critical: Ensure google webfonts are fully parsed and ready to prevent FOIT
      await page.evaluateHandle(() => document.fonts.ready);
      // Extra safety wait for Unsplash images to draw
      await new Promise(resolve => setTimeout(resolve, 300));

      const slidePath = path.join(postDir, `slide_${idx + 1}.png`);
      await page.screenshot({ path: slidePath, type: 'png' });
      renderedPaths.push(`/posts/${postId}/slide_${idx + 1}.png`);
    }

    await db.log('SYSTEM', `Finished rendering ${slides.length} slides for post "${postId}"`);
    return renderedPaths;
  } catch (error) {
    await db.log('ERROR', `Renderer encountered an error: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      await db.log('SYSTEM', `Closed Puppeteer browser instance`);
    }
  }
}

function generateReelHTML(titleText, themeName, handle, categoryName, theme, logoBase64, bgBase64) {
  const logoDataUrl = `data:image/png;base64,${logoBase64}`;
  const bgDataUrl = bgBase64 ? `data:image/jpeg;base64,${bgBase64}` : '';
  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;

  // Parse titleText into a title line and body paragraphs
  const rawLines = titleText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let confessionTitleHTML = '';
  let confessionBodyHTML = '';

  const firstLine = rawLines[0] || '';
  const titleMatch = firstLine.match(/^["""'](.*?)["""']$/);
  if (titleMatch && firstLine.length < 60) {
    confessionTitleHTML = `<h2 class="reel-confession-title">&ldquo;${titleMatch[1]}&rdquo;</h2>`;
    confessionBodyHTML = rawLines.slice(1).map(line => `<p class="reel-confession-para">${line}</p>`).join('');
  } else {
    confessionBodyHTML = rawLines.map(line => `<p class="reel-confession-para">${line}</p>`).join('');
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reel Render</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  ${theme.fontImport || ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      background-color: #050507;
      font-family: ${theme.bodyFont || "'Lora', serif"};
    }
    #reel-container {
      width: 1080px;
      height: 1920px;
      position: relative;
      color: #fff;
      overflow: hidden;
    }
    /* Background image — clearly visible, moody darkened */
    .reel-bg {
      position: absolute;
      top: 0; left: 0;
      width: 1080px; height: 1920px;
      background-image: url('${bgDataUrl}');
      background-size: cover;
      background-position: center;
      filter: brightness(0.52) contrast(1.08) saturate(0.88);
      z-index: 1;
    }
    /* Subtle gradient vignette so text is readable without killing the background */
    .reel-vignette {
      position: absolute;
      top: 0; left: 0;
      width: 1080px; height: 1920px;
      background: radial-gradient(ellipse at center, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.55) 100%),
                  linear-gradient(180deg, rgba(5,5,7,0.35) 0%, rgba(5,5,7,0.0) 30%, rgba(5,5,7,0.0) 70%, rgba(5,5,7,0.55) 100%);
      z-index: 2;
    }
    /* Glassmorphism card — center of frame */
    .reel-text-card {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 900px;
      z-index: 10;
      background: rgba(0, 0, 0, 0.38);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border-radius: 28px;
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 24px 64px rgba(0,0,0,0.70);
      padding: 52px 60px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .reel-confession-title {
      font-family: ${theme.bodyFont || "'Lora', serif"};
      font-size: 52px;
      font-weight: 700;
      font-style: italic;
      color: ${theme.accentColor || '#fbbf24'};
      text-align: left;
      letter-spacing: 0.5px;
      text-shadow: 0 3px 14px rgba(0,0,0,0.90);
      line-height: 1.25;
    }
    .reel-confession-para {
      font-family: ${theme.bodyFont || "'Lora', serif"};
      font-size: 38px;
      line-height: 1.65;
      color: #ffffff;
      font-weight: 400;
      text-align: left;
      text-shadow: 0 2px 10px rgba(0,0,0,0.95);
    }
    .reel-confession-para:last-child {
      font-weight: 500;
      color: rgba(255,255,255,0.92);
    }
    /* Watermark — bottom right */
    .reel-watermark {
      position: absolute;
      bottom: 90px;
      right: 70px;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 14px;
      opacity: 0.88;
    }
    .reel-watermark-handle {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: rgba(255,255,255,0.95);
      text-shadow: 0 2px 8px rgba(0,0,0,0.8);
      text-transform: lowercase;
    }
    .reel-watermark-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));
    }
    ${theme.customCSS || ''}
  </style>
</head>
<body>
  <div id="reel-container">
    <div class="reel-bg"></div>
    <div class="reel-vignette"></div>
    <div class="reel-text-card">
      ${confessionTitleHTML}
      ${confessionBodyHTML}
    </div>
    <div class="reel-watermark">
      <span class="reel-watermark-handle">${cleanHandle}</span>
      <img class="reel-watermark-logo" src="${logoDataUrl}" alt="Logo" />
    </div>
  </div>
</body>
</html>
  `;
}

export async function renderReelSlide(postId, titleText, themeName, categoryName, pexelsQuery = null) {
  const settings = await db.getSettings();
  const handle = settings.pageHandle || '@unspokendesireshub';
  const postDir = path.join(__dirname, '..', 'data', 'posts', postId);
  
  await fs.mkdir(postDir, { recursive: true });
  await db.log('SYSTEM', `Creating Reels slide directory: "${postDir}"`);

  // Look up post scheduled date to determine its styling theme
  let dayOfWeek = new Date().getDay();
  try {
    const post = await db.getPost(postId);
    if (post && post.scheduledFor) {
      dayOfWeek = new Date(post.scheduledFor).getDay();
    }
  } catch (err) {
    // Ignore and fallback to today
  }
  const theme = STYLE_THEMES[dayOfWeek] || STYLE_THEMES[3];
  await db.log('SYSTEM', `Applying daily visual theme: "${theme.name}" (Day of week: ${dayOfWeek})`);

  // Load logo as base64
  const logoPath = path.join(__dirname, '..', 'data', 'logo.png');
  let logoBase64 = '';
  try {
    logoBase64 = await fs.readFile(logoPath, 'base64');
  } catch (err) {
    await db.log('ERROR', `Failed to load logo image: ${err.message}`);
  }

  // Download unique background image from Pollinations.ai for the reel (9:16)
  let bgBase64 = '';
  try {
    const PEXELS_REEL_QUERIES = {
      midnight_desire: 'romantic couple intimate shadow dark bedroom candlelight silhouette',
      rainy_bed: 'rain night bedroom window cozy dark silk sheets',
      shadowy_lounge: 'bar night couple whispering shadow low light luxury',
      candlelight_secrets: 'candlelight hands close dark table romantic night',
      intimate_touch: 'couple embrace shadow intimacy body dark low light',
      overthinking_night: 'person looking window city night neon rain lonely',
      secret_thoughts: 'person bed phone glow dark silk sheets night bedroom',
      sensual_vibes: 'crimson silk gold texture dark abstract luxury'
    };
    const query = pexelsQuery || PEXELS_REEL_QUERIES[themeName] || 'romantic couple dark intimate';
    const styledPrompt = `${query}, cinematic lighting, dark atmosphere, moody shadows, low light, photorealistic, 8k, premium aesthetics, sensual, no text, no watermark`;
    const seed = Math.floor(Math.random() * 1000000000);
    // 9:16 aspect ratio for Reels background
    const bgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(styledPrompt)}?width=1080&height=1920&nologo=true&seed=${seed}`;
    await db.log('SYSTEM', `Generating 9:16 Reel background from Pollinations.ai (seed: ${seed}): ${query}`);
    const bgResp = await fetch(bgUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' }
    });
    if (bgResp.ok) {
      const bgBuf = Buffer.from(await bgResp.arrayBuffer());
      // Save for ffmpeg use as well
      await fs.writeFile(path.join(postDir, 'background_reel.jpg'), bgBuf);
      bgBase64 = bgBuf.toString('base64');
      await db.log('SYSTEM', `Successfully loaded 9:16 Reel background image.`);
    } else {
      await db.log('ERROR', `Pollinations Reel background returned status ${bgResp.status}`);
    }
  } catch (err) {
    await db.log('ERROR', `Failed to fetch Reel background image: ${err.message}`);
  }

  let browser = null;
  try {
    await db.log('SYSTEM', `Launching Puppeteer browser instance for Reel...`);
    const executablePath = process.platform === 'linux' ? '/usr/bin/google-chrome' : undefined;
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

    const htmlContent = generateReelHTML(titleText, themeName, handle, categoryName, theme, logoBase64, bgBase64);
    
    await db.log('SYSTEM', `Rendering Reel slide graphic with background...`);
    await page.setContent(htmlContent, { waitUntil: 'load' });
    
    await page.evaluateHandle(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 500));

    const slidePath = path.join(postDir, `slide.png`);
    await page.screenshot({ path: slidePath, type: 'png' });
    
    await db.log('SYSTEM', `Finished rendering Reel slide for post "${postId}"`);
    return `/posts/${postId}/slide.png`;
  } catch (error) {
    await db.log('ERROR', `Reel Renderer encountered an error: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      await db.log('SYSTEM', `Closed Puppeteer browser instance for Reel`);
    }
  }
}

export async function renderReelCTA(postId) {
  const settings = await db.getSettings();
  const handle = settings.pageHandle || '@auraflow.co';
  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const postDir = path.join(__dirname, '..', 'data', 'posts', postId);
  
  await fs.mkdir(postDir, { recursive: true });

  // Look up post scheduled date to determine its styling theme
  let dayOfWeek = new Date().getDay();
  try {
    const post = await db.getPost(postId);
    if (post && post.scheduledFor) {
      dayOfWeek = new Date(post.scheduledFor).getDay();
    }
  } catch (err) {
    // Ignore and fallback to today
  }
  const theme = STYLE_THEMES[dayOfWeek] || STYLE_THEMES[3];
  const logoPath = path.join(__dirname, '..', 'data', 'logo.png');
  let logoBase64 = '';
  try {
    logoBase64 = await fs.readFile(logoPath, 'base64');
  } catch (err) {
    // Ignore
  }
  const logoDataUrl = `data:image/png;base64,${logoBase64}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Satisfy&family=Outfit:wght@600;800&display=swap" rel="stylesheet">
  ${theme.fontImport || ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      background-color: transparent;
      font-family: ${theme.bodyFont || "'Outfit', sans-serif"};
    }
    #cta-container {
      width: 1080px;
      height: 1920px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #fff;
      background: rgba(6, 6, 8, 0.78); /* Semi-transparent dark background for CTA overlay */
    }
    .logo-box {
      position: relative;
      line-height: 1;
      margin-bottom: 50px;
      transform: scale(1.6);
    }
    .brand-the {
      font-family: 'Satisfy', cursive;
      font-size: 38px;
      color: #fff;
      display: block;
      margin-bottom: -20px;
      margin-left: 12px;
    }
    .brand-num {
      font-family: 'Outfit', sans-serif;
      font-size: 110px;
      font-weight: 800;
      color: ${theme.accentColor || '#f59e0b'};
      letter-spacing: -2px;
    }
    .brand-diary {
      font-family: 'Satisfy', cursive;
      font-size: 68px;
      color: #fff;
      position: absolute;
      bottom: 28px;
      left: 110px;
      transform: rotate(-10deg);
      text-shadow: 0 4px 10px rgba(0,0,0,0.5);
    }
    .follow-text {
      font-size: 42px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 60px;
      color: #fff;
      font-family: 'Outfit', sans-serif;
    }
    .handle-badge {
      background: ${theme.accentColor || '#f59e0b'};
      color: #000;
      font-size: 48px;
      font-weight: 800;
      padding: 12px 45px;
      border-radius: 50px;
      margin-top: 25px;
      box-shadow: 0 10px 30px rgba(245, 158, 11, 0.3);
      letter-spacing: 0.5px;
      font-family: 'Outfit', sans-serif;
    }
    ${theme.customCSS || ''}
  </style>
</head>
<body>
    <div id="cta-container">
      <div class="logo-box" style="margin-bottom: 20px;">
        <img src="${logoDataUrl}" alt="Logo" style="height: 250px; width: auto; object-fit: contain; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.6));" />
      </div>
      <div class="follow-text" style="margin-top: 30px;">Follow for unspoken desires</div>
      <div class="handle-badge" style="margin-top: 20px;">${cleanHandle}</div>
    </div>
</body>
</html>
  `;

  let browser = null;
  try {
    await db.log('SYSTEM', `Launching Puppeteer browser instance for Reel CTA...`);
    const executablePath = process.platform === 'linux' ? '/usr/bin/google-chrome' : undefined;
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.setContent(htmlContent, { waitUntil: 'load' });
    await page.evaluateHandle(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const ctaPath = path.join(postDir, `cta.png`);
    await page.screenshot({ path: ctaPath, type: 'png', omitBackground: true });
    
    await db.log('SYSTEM', `Finished rendering Reel CTA slide for post "${postId}"`);
    return `/posts/${postId}/cta.png`;
  } catch (error) {
    await db.log('ERROR', `Reel CTA Renderer encountered an error: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      await db.log('SYSTEM', `Closed Puppeteer browser instance for Reel CTA`);
    }
  }
}

export default {
  renderPostSlides,
  renderReelSlide,
  renderReelCTA
};
