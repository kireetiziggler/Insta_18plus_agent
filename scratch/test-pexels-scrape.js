import puppeteer from 'puppeteer';

async function scrapePexelsVideos(query) {
  console.log(`Scraping Pexels videos for query: "${query}"...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  
  try {
    const url = `https://www.pexels.com/search/videos/${encodeURIComponent(query)}/?orientation=portrait`;
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    await page.waitForSelector('video source, video', { timeout: 10000 });
    
    const videoSrcs = await page.evaluate(() => {
      const urls = [];
      const sources = Array.from(document.querySelectorAll('video source'));
      for (const src of sources) {
        if (src.src && src.src.includes('.mp4')) {
          urls.push(src.src);
        }
      }
      const videos = Array.from(document.querySelectorAll('video'));
      for (const v of videos) {
        if (v.src && v.src.includes('.mp4')) {
          urls.push(v.src);
        }
      }
      return Array.from(new Set(urls));
    });
    
    console.log(`Found ${videoSrcs.length} unique video sources:`);
    videoSrcs.forEach((src, idx) => console.log(`${idx + 1}: ${src}`));
    
    if (videoSrcs.length > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(videoSrcs.length, 8));
      const chosen = videoSrcs[randomIndex];
      console.log(`\nChose random video (index ${randomIndex}): ${chosen}`);
      return chosen;
    }
    return null;
  } catch (err) {
    console.error('Error scraping Pexels video:', err.message);
    return null;
  } finally {
    await browser.close();
  }
}

scrapePexelsVideos('rain');
