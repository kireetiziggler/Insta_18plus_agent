import puppeteer from 'puppeteer';

async function testRedditPuppeteer() {
  console.log('Testing Reddit scraping via Puppeteer...');
  
  const subreddit = 'getdisciplined';
  const url = `https://old.reddit.com/r/${subreddit}/`; // old.reddit is lightweight and extremely easy to scrape

  let browser = null;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log('Parsing page contents...');
    // Parse old.reddit.com structure which is extremely clean
    const posts = await page.evaluate(() => {
      const items = [];
      const thinElements = document.querySelectorAll('.thing');
      
      thinElements.forEach(el => {
        // Skip stickied posts if desired, or keep them
        const isSticky = el.classList.contains('sticky');
        const id = el.getAttribute('data-fullname');
        const titleEl = el.querySelector('a.title');
        const scoreEl = el.querySelector('.score.unvoted');
        const commentsEl = el.querySelector('a.comments');
        const permalink = el.getAttribute('data-permalink');
        
        if (titleEl) {
          let score = 0;
          if (scoreEl) {
            const txt = scoreEl.textContent.trim();
            if (txt && !isNaN(txt)) score = parseInt(txt);
          }

          let comments = 0;
          if (commentsEl) {
            const txt = commentsEl.textContent.trim().split(' ')[0];
            if (txt && !isNaN(txt)) comments = parseInt(txt);
          }

          items.push({
            id: id || Math.random().toString(),
            title: titleEl.textContent.trim(),
            score: score,
            num_comments: comments,
            url: `https://old.reddit.com${permalink}`,
            isSticky
          });
        }
      });
      return items;
    });

    console.log(`✓ Success! Retrieved ${posts.length} posts.`);
    console.log('Top 3 posts:');
    posts.slice(0, 3).forEach((p, idx) => {
      console.log(`  ${idx + 1}. [Upvotes: ${p.score}, Comments: ${p.num_comments}] ${p.title}`);
    });

  } catch (error) {
    console.error('✗ Failed to scrape via Puppeteer:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

testRedditPuppeteer();
