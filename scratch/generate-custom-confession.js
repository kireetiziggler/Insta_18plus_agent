import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const ARTIFACTS_DIR = 'C:\\Users\\kiree\\.gemini\\antigravity\\brain\\11fd77fa-f686-4b82-83db-9dc123b5eda6';
const LOGO_PATH = 'c:\\Users\\kiree\\OneDrive\\Documents\\Insta_18plus_agent\\data\\logo.png';

const POST_A = {
  id: 'option_a_hands',
  imageName: 'almost_touching_hands_1781447453933.png',
  hook: 'WE ALMOST CROSSED THE LINE.',
  body: 'My hand hovered over yours for a heartbeat too long. Neither of us pulled away, but neither of us dared to close the remaining inch. The room was full, but all I could hear was the sudden weight of our breathing.',
  cta: 'What are we waiting for? ❣',
  accentColor: '#f87171', // Soft Crimson
  bgFilter: 'brightness(0.75) contrast(1.02) saturate(0.95)'
};

const POST_B = {
  id: 'option_b_couple',
  imageName: 'intimate_hesitation_couple_1781447472355.png',
  hook: 'ONE INCH APART.',
  body: 'I looked at your mouth when you stopped talking, and for a second, the whole room went silent. We were both frozen, balanced on the thin edge of a mistake we both wanted to make. One of us has to break first.',
  cta: 'Who is going to take the risk? ❣',
  accentColor: '#fbbf24', // Amber/Gold
  bgFilter: 'brightness(0.7) contrast(1.05) saturate(0.9)'
};

function generateSlideHTML(post, bgBase64, logoBase64) {
  const bgDataUrl = `data:image/png;base64,${bgBase64}`;
  const logoDataUrl = `data:image/png;base64,${logoBase64}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Slide Render</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 1080px;
      height: 1350px;
      overflow: hidden;
      background-color: #08080a;
      font-family: 'Lora', serif;
    }
    #slide-container {
      width: 1080px;
      height: 1350px;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 95px 90px 90px 90px;
      color: #fff;
      z-index: 5;
    }
    .bg-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 1080px;
      height: 1350px;
      background-image: url('${bgDataUrl}');
      background-size: cover;
      background-position: center;
      filter: ${post.bgFilter};
      z-index: 1;
    }
    /* Balanced left-to-right gradient overlay to preserve background image details on the right */
    .bg-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 1080px;
      height: 1350px;
      background: linear-gradient(90deg, rgba(6, 6, 8, 0.82) 0%, rgba(6, 6, 8, 0.4) 55%, rgba(6, 6, 8, 0.0) 100%);
      z-index: 2;
    }
    
    header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      z-index: 10;
    }
    .header-handle {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 3px;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
    }
    
    /* Clean text layout positioned in negative space (left side) */
    .quote-section {
      z-index: 10;
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex-grow: 1;
      max-width: 760px;
      margin-top: -30px;
    }
    .hook-title {
      font-family: 'Outfit', sans-serif;
      font-size: 44px;
      font-weight: 800;
      color: ${post.accentColor};
      margin-bottom: 24px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.3;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
    }
    .story-body {
      font-size: 34px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.95);
      font-weight: 400;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
    }
    .question-hook {
      font-family: 'Lora', serif;
      font-size: 28px;
      font-style: italic;
      color: ${post.accentColor};
      font-weight: 600;
      margin-top: 24px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
    }
    
    footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 24px;
    }
    .footer-left {
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
    }
    .footer-right {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .footer-right span {
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.7);
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .brand-logo {
      height: 38px;
      width: auto;
      object-fit: contain;
      opacity: 0.8;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }
  </style>
</head>
<body>
  <div class="bg-image"></div>
  <div class="bg-overlay"></div>
  
  <div id="slide-container">
    <header>
      <div class="header-handle">@unspokendesireshub</div>
    </header>
    
    <div class="quote-section">
      <div class="hook-title">${post.hook}</div>
      <p class="story-body">${post.body}</p>
      <div class="question-hook">${post.cta}</div>
    </div>
    
    <footer>
      <div class="footer-left">Anonymous Confession</div>
      <div class="footer-right">
        <span>Unspoken Desires</span>
        <img class="brand-logo" src="${logoDataUrl}" alt="Logo" />
      </div>
    </footer>
  </div>
</body>
</html>
  `;
}

async function renderPost(post) {
  const bgPath = path.join(ARTIFACTS_DIR, post.imageName);
  const logoBase64 = await fs.readFile(LOGO_PATH, 'base64');
  const bgBase64 = await fs.readFile(bgPath, 'base64');

  const htmlContent = generateSlideHTML(post, bgBase64, logoBase64);
  
  console.log(`Launching Puppeteer for ${post.id}...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
    
    await page.setContent(htmlContent, { waitUntil: 'load' });
    await page.evaluateHandle(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const outputPath = path.join(ARTIFACTS_DIR, `sample_minimalist_${post.id}.png`);
    await page.screenshot({ path: outputPath, type: 'png' });
    console.log(`Successfully rendered to ${outputPath}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  await renderPost(POST_A);
  await renderPost(POST_B);
  console.log("All posts rendered successfully!");
}

main().catch(err => {
  console.error("Error running script:", err);
});
