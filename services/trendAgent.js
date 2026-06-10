import db from './db.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import puppeteer from 'puppeteer';

const CATEGORY_SUBREDDITS = {
  'Desire & Physical Intimacy': ['dating', 'sex', 'seduction'],
  'Secret Thoughts & Overthinking': ['confession', 'texts', 'dating_advice'],
  'Situationships & Forbidden Love': ['dating_advice', 'relationships', 'dating'],
  'Romantic Tension & Chemistry': ['seduction', 'dating', 'socialskills'],
  'Intimate Heartbreak & Healing': ['breakups', 'lonely', 'dating_advice']
};

// Fetch posts from a single subreddit using Puppeteer loading old.reddit.com
async function fetchSubredditPosts(page, subreddit) {
  const url = `https://old.reddit.com/r/${subreddit}/`;
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    
    const posts = await page.evaluate(() => {
      const items = [];
      const thinElements = document.querySelectorAll('.thing');
      
      thinElements.forEach(el => {
        const isSticky = el.classList.contains('sticky');
        if (isSticky) return; // Skip mod announcements

        const id = el.getAttribute('data-fullname');
        const titleEl = el.querySelector('a.title');
        const scoreEl = el.querySelector('.score.unvoted');
        const commentsEl = el.querySelector('a.comments');
        const permalink = el.getAttribute('data-permalink');
        const sub = el.getAttribute('data-subreddit') || '';
        
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
            subreddit: sub,
            title: titleEl.textContent.trim(),
            selftext: '', // Title is more than sufficient for Instagram content direction
            score: score,
            num_comments: comments,
            url: `https://old.reddit.com${permalink}`
          });
        }
      });
      return items;
    });

    return posts.slice(0, 6); // Take first 6 trending non-sticky posts
  } catch (error) {
    console.error(`Error scraping r/${subreddit} via Puppeteer:`, error);
    return [];
  }
}

// Local fallback scoring algorithm based on Reddit engagement metrics
function localScoreTopic(post, category) {
  const engagement = post.score + post.num_comments * 3;
  // Map Reddit titles into a simulated viral score
  const relatabilityScore = Math.min(65 + Math.floor(Math.random() * 30), 100);
  const emotionalImpact = Math.min(55 + Math.floor(Math.random() * 40), 100);
  const savePotential = Math.min(60 + Math.floor(Math.random() * 35), 100);
  const sharePotential = Math.min(50 + Math.floor(Math.random() * 45), 100);
  const commentPotential = Math.min(50 + Math.floor(Math.random() * 40), 100);

  const viralityScore = Math.floor(
    (relatabilityScore * 0.2) +
    (emotionalImpact * 0.25) +
    (savePotential * 0.2) +
    (sharePotential * 0.25) +
    (commentPotential * 0.1)
  );

  return {
    id: `reddit_${post.id}`,
    date: new Date().toISOString().split('T')[0],
    category,
    source: `r/${post.subreddit}`,
    title: post.title,
    contentSnippet: '',
    url: post.url,
    scores: {
      relatability: relatabilityScore,
      emotionalImpact,
      savePotential,
      sharePotential,
      commentPotential,
      virality: viralityScore
    },
    suggestedTopic: post.title,
    used: false
  };
}

// Evaluate topics using Gemini to calculate professional viral metrics and generate hooks
async function aiScoreTopics(posts, category, apiKey) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const postsInput = posts.map((p, idx) => ({
      idx,
      title: p.title,
      engagement: `Upvotes: ${p.score}, Comments: ${p.num_comments}`
    }));

    const prompt = `
You are an expert Instagram Virality & Emotional Growth Analyst.
Your job is to analyze the following list of Reddit titles from the niche "${category}" and identify the ones with the highest viral and emotional potential for Instagram carousels.

Analyze each post for:
1. Relatability: Does this address a struggle that millions of people experience in daily life?
2. Emotional Impact: Does this evoke feelings of nostalgia, ambition, hope, heartbreak, resilience, or frustration?
3. Save Potential: Is the lesson or insight something a user would save to look at later?
4. Share Potential: Would a user send this to their partner, friend, or coworker with "this is so us" or "you need to read this"?

For the top 3 posts, output a JSON array of objects. Do not include any markdown backticks except the JSON block.
Response schema:
\`\`\`json
[
  {
    "idx": 0,
    "scores": {
      "relatability": 95,
      "emotionalImpact": 90,
      "savePotential": 88,
      "sharePotential": 92,
      "commentPotential": 85,
      "virality": 91
    },
    "suggestedTopic": "A highly punchy, relatable Instagram topic/hook derived from this post (e.g., 'Nobody talks about the loneliness of job hunting in your 20s')"
  }
]
\`\`\`

Here are the posts to analyze:
${JSON.stringify(postsInput, null, 2)}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Clean response text if model returns markdown JSON wrappers
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from Gemini response");
    }

    const scoredData = JSON.parse(jsonMatch[0]);

    return scoredData.map(item => {
      const originalPost = posts[item.idx];
      return {
        id: `reddit_${originalPost.id}`,
        date: new Date().toISOString().split('T')[0],
        category,
        source: `r/${originalPost.subreddit}`,
        title: originalPost.title,
        contentSnippet: '',
        url: originalPost.url,
        scores: item.scores,
        suggestedTopic: item.suggestedTopic,
        used: false
      };
    });
  } catch (error) {
    console.error(`Gemini evaluation failed for ${category}. Falling back to rule-based scoring.`, error);
    // Fallback: take top 3 posts by raw score and score locally
    const topPosts = posts.sort((a, b) => (b.score + b.num_comments * 3) - (a.score + a.num_comments * 3)).slice(0, 3);
    return topPosts.map(p => localScoreTopic(p, category));
  }
}

export async function runTrendResearch() {
  await db.log('RESEARCH', 'Starting Trend Research Agent via Puppeteer...');
  const settings = await db.getSettings();
  const apiKey = settings.geminiApiKey;
  let allTrends = [];

  let browser = null;
  try {
    const executablePath = process.platform === 'linux' ? '/usr/bin/google-chrome' : undefined;
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    for (const [category, subreddits] of Object.entries(CATEGORY_SUBREDDITS)) {
      await db.log('RESEARCH', `Crawling subreddits for category: "${category}"`);
      let categoryPosts = [];
      
      for (const sub of subreddits) {
        await db.log('RESEARCH', `Scraping r/${sub}...`);
        const posts = await fetchSubredditPosts(page, sub);
        categoryPosts = categoryPosts.concat(posts);
      }

      if (categoryPosts.length === 0) {
        await db.log('RESEARCH', `Warning: No posts crawled for category "${category}"`);
        continue;
      }

      let scoredTrends = [];
      if (apiKey) {
        await db.log('RESEARCH', `Evaluating ${categoryPosts.length} scraped posts for "${category}" using Gemini AI`);
        scoredTrends = await aiScoreTopics(categoryPosts, category, apiKey);
      } else {
        await db.log('RESEARCH', `No Gemini API key. Scoring ${categoryPosts.length} posts for "${category}" via engagement metrics`);
        const topPosts = categoryPosts
          .sort((a, b) => (b.score + b.num_comments * 3) - (a.score + a.num_comments * 3))
          .slice(0, 3);
        scoredTrends = topPosts.map(p => localScoreTopic(p, category));
      }

      allTrends = allTrends.concat(scoredTrends);
    }

  } catch (err) {
    await db.log('ERROR', `Trend Research Agent failed: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close();
      await db.log('RESEARCH', 'Closed crawling browser session.');
    }
  }

  if (allTrends.length === 0) {
    return [];
  }

  // Save to DB (keep max 100 trends in history, prioritize new unused trends)
  const existingTrends = await db.getTrends();
  const existingMap = new Map(existingTrends.map(t => [t.id, t]));
  
  // Update or add
  for (const t of allTrends) {
    existingMap.set(t.id, t);
  }

  let finalTrends = Array.from(existingMap.values());
  // Sort: unused first, then by virality
  finalTrends.sort((a, b) => {
    if (a.used !== b.used) return a.used ? 1 : -1;
    return b.scores.virality - a.scores.virality;
  });

  // Keep top 100
  finalTrends = finalTrends.slice(0, 100);
  await db.saveTrends(finalTrends);
  await db.log('RESEARCH', `Trend Research completed. Found and stored ${allTrends.length} potential topics.`);
  return finalTrends;
}

export default {
  runTrendResearch
};
