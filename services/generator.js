import { GoogleGenerativeAI } from '@google/generative-ai';
import db from './db.js';

// Pre-written, high-quality emotional templates for fallback/simulation mode
const OFFLINE_TEMPLATES = {
  'Anonymous Confessions': [
    {
      backgroundTheme: 'midnight_desire',
      slides: [
        "I still remember the way he looked at me in the elevator. It wasn't a normal glance—it was like he was reading my deepest secrets. When our shoulders accidentally brushed, I had to hold my breath so he wouldn't hear my heart racing. Do you think he felt the spark too? ❦"
      ],
      caption: "Sometimes a single brush is enough to start a fire. Have you ever felt an instant connection that you couldn't explain? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'intimate_touch',
      slides: [
        "She wears this vanilla perfume that completely takes over my thoughts. Yesterday, she leaned in to show me something on her phone, and all I could focus on was the warmth of her shoulder against mine. I wanted to pull her close right then and there. Is it too early to confess? ❦"
      ],
      caption: "Vanilla and dangerous tension. What is the one scent that always reminds you of them? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'secret_thoughts',
      slides: [
        "We're supposed to be 'just colleagues,' but when he texts me late at night about work, we both know it's an excuse. Last night, he asked if I was still awake, and my stomach did a complete flip. We are playing a dangerous game. How do I stop before we cross the line? ❦"
      ],
      caption: "Late night texts and blurred boundaries. Are you playing a dangerous game with someone? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'shadowy_lounge',
      slides: [
        "I catch her staring at my mouth when I speak, but the second I look back, she turns away. She thinks she's being subtle, but it's driving me crazy. One of these days, I'm not going to look away. What happens if I make the first move? ❦"
      ],
      caption: "The quiet look that says everything. How do you tell if someone is secretly into you? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    }
  ],
  'Intimate Secrets': [
    {
      backgroundTheme: 'secret_thoughts',
      slides: [
        "I have a secret folder on my phone with screenshots of our conversations. I read them when the nights get too quiet, replaying the way he said my name in my head. It's a silly crush, but it's the only thing keeping me warm. Am I the only one who does this? ❣"
      ],
      caption: "Replaying the words in the dark. Do you keep screenshots of texts that make you smile? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'intimate_touch',
      slides: [
        "Every time we hug goodbye, I hold her a fraction of a second longer than a friend should. I check if she pulls away first, but she never does. We're both too scared to cross the line, so we just linger in the middle. Should I take the risk? ❣"
      ],
      caption: "The extra second that tells the truth. Are you lingering in the friend zone or is the tension real? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'candlelight_secrets',
      slides: [
        "He thinks I don't notice the way he positions himself close to me when we're in a crowd. He acts like he's just protecting me, but the heat of his body tells a completely different story. I secretly love it. How do I let him know he doesn't have to keep his distance? ❣"
      ],
      caption: "Unspoken protection and silent chemistry. What is your favorite way someone shows they care? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'rainy_bed',
      slides: [
        "She left her earring in my car last week. I kept it in my glove box instead of telling her. It's just a tiny piece of metal, but every time I see it, I smell her perfume and remember how close we sat. Is keeping it a sign of something more? ❣"
      ],
      caption: "A small reminder of their presence. Have you ever kept something small just to remember them by? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    }
  ]
};

// Helper to get recent post hooks as a negative constraint for Gemini
async function getRecentConstraintText() {
  try {
    const posts = await db.getPosts();
    if (!posts || posts.length === 0) return "";
    
    // Get the last 15 posts/reels to exclude their hooks/lines
    const recentHooks = posts
      .slice(-15)
      .map(p => {
        const title = p.type === 'reel' ? p.titleText : (p.slides ? p.slides[0] : '');
        return title ? `- "${title}"` : null;
      })
      .filter(h => h !== null);

    if (recentHooks.length > 0) {
      return `\nCRITICAL VARIETY REQUIREMENT:
You MUST NOT duplicate, repeat, or closely mimic the hooks, lines, or core ideas of the following recent posts/reels:
${recentHooks.join('\n')}
Make sure the new content has a completely fresh angle, unique lines, and a different narrative setup. Do not repeat any exact phrases or hook patterns.`;
    }
  } catch (e) {
    // Ignore errors
  }
  return "";
}

// Generates post using Gemini API based on category and optional topic/trend details
async function generateAIPost(category, topicQuery, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  // Query successful posts for reinforcement context
  let examplesText = "";
  try {
    const posts = await db.getPosts();
    const successfulPosts = posts
      .filter(p => p.status === 'published' && p.analytics)
      .map(p => {
        const eng = (p.analytics.likes || 0) + (p.analytics.comments || 0) + (p.analytics.saves || 0) + (p.analytics.shares || 0);
        return { category: p.category, hook: p.slides[0], engagement: eng };
      })
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3);

    if (successfulPosts.length > 0) {
      examplesText = `\nHere are some of our page's past high-performing post hooks for reference and inspiration:\n${successfulPosts.map(p => `- Category: [${p.category}] -> Hook: "${p.hook}" (Total Engagement: ${p.engagement})`).join('\n')}\nGenerate hooks with similar emotional depth and tension.`;
    }
  } catch (e) {
    // Ignore context gathering errors and continue
  }

  const recentConstraintText = await getRecentConstraintText();

  const prompt = `
You are a master copywriter and viral growth strategist for an Instagram page named "Unspoken Desires" focusing on mature relationship confessions, secret thoughts, fantasies, and raw romantic chemistry.
Your target audience consists of adults aged 20-35 who are deeply drawn to raw romantic tension, secret desires, modern situationships, and unspoken thoughts that keep them awake at night.
The goal of this content is to act as an immediate trigger point—making readers feel a sudden wave of romantic tension, physical craving, or deep relatability that commands an immediate follow.

Generate an incredibly suggestive, high-tension, and seductive single-slide post (not a multi-slide carousel) and caption for the category: "${category}".
${topicQuery ? `Base the content and theme on this trending topic/issue: "${topicQuery}".` : ''}
${examplesText}
${recentConstraintText}

CRITICAL CONTENT INSTRUCTIONS:
- Content Format: Write the post as a realistic, anonymous confession-style story (1st person perspective, starting with "I"). It must feel like an authentic secret shared by a girl or a boy about their thoughts, fantasies, desires, emotions, crushes, relationship experiences, or untold feelings.
- Writing Style: Deep, raw, highly suggestive, and sensually charged. Use short, heavy, punchy sentences. It must feel like a quiet confession whispered in the dark, a secret shared between sheets, or a raw psychological truth about physical desire and skin-to-skin attraction.
- Perspective: Vary between male and female perspectives.
- Compliance: Keep it strictly non-explicit and non-pornographic, but high-voltage PG-13/R-rated romance tension. Compliant with Instagram and Facebook safety policies.
- Slide text: Generate exactly 1 slide content containing a powerful confession hook and a short, highly suggestive storytelling paragraph. End the slide text with a thought-provoking question or hook that creates curiosity. Use 3-4 short, punchy sentences in total (max 45-60 words). Include one of the mature symbols (❦, ❣, ❥, ✦) as a subtle punctuation separator.
- Caption: Keep the caption extremely brief—exactly one provocative, highly suggestive line (1 sentence, max 10-15 words) that asks an engaging question or hook, followed directly by 5-6 high-reach hashtags (e.g. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage). Do not include lists, bullet points, or multiple lines.

Select a background visual theme from this list that best fits the mood:
- 'midnight_desire' (for romantic chemistry, intimacy, physical connection)
- 'rainy_bed' (for midnight thoughts, quiet intimacy, rain views)
- 'shadowy_lounge' (for modern dating, luxury bar scenes, romantic tension)
- 'candlelight_secrets' (for soft candlelight, close chemistry, secret touch)
- 'intimate_touch' (for deep connection, physical touch, embrace)
- 'overthinking_night' (for night reflections, car window thoughts, cold attitude)
- 'secret_thoughts' (for late-night overthinking, phone screen glow, silk bed)
- 'sensual_vibes' (for abstract gold and crimson luxury textures)

Response must be valid JSON matching this schema:
\`\`\`json
{
  "backgroundTheme": "midnight_desire",
  "slides": [
    "Slide hook and confession story text combined here..."
  ],
  "caption": "One line caption text #intimacy #chemistry..."
}
\`\`\`
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();
  const parsedData = JSON.parse(responseText);

  // Validate structures
  if (!parsedData.backgroundTheme || !Array.isArray(parsedData.slides) || parsedData.slides.length !== 1 || !parsedData.caption) {
    throw new Error("Invalid structure returned by Gemini AI");
  }

  return parsedData;
}

function formatOneLineCaption(caption) {
  if (!caption) return '';
  // Split by newline to get the first line
  const lines = caption.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let firstLine = lines[0] || '';
  
  // Strip out any existing hashtags from the first line
  if (firstLine.includes('#')) {
    firstLine = firstLine.split('#')[0].trim();
  }
  
  // Strip out any trailing mature symbols to keep it clean if they are duplicated
  firstLine = firstLine.replace(/[❦❣❥✦]/g, '').trim();
  
  // High-reach hashtags for relationship intimacy, seduction, and tension
  const bestReachHashtags = '#intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage';
  
  return `${firstLine} ${bestReachHashtags}`;
}

export async function generatePostContent(category, topicQuery = null) {
  const settings = await db.getSettings();
  const apiKey = settings.geminiApiKey;

  await db.log('GENERATOR', `Generating content for category: "${category}"...`);

  let content;
  if (apiKey) {
    try {
      content = await generateAIPost(category, topicQuery, apiKey);
      await db.log('GENERATOR', `Successfully generated AI content using Gemini. Theme: "${content.backgroundTheme}"`);
    } catch (error) {
      await db.log('ERROR', `Gemini content generation failed: ${error.message}. Falling back to offline template.`);
      content = getOfflineTemplate(category);
    }
  } else {
    await db.log('GENERATOR', `No Gemini API key found. Selecting a high-quality offline template...`);
    content = getOfflineTemplate(category);
  }

  // Double check page handle formatting in CTAs
  const handle = settings.pageHandle || '@auraflow.co';
  content.slides = content.slides.map(slide => slide.replace(/@page_handle|@auraflow.co/gi, handle));
  
  // Enforce single line caption with best reach hashtags
  content.caption = formatOneLineCaption(content.caption).replace(/@page_handle|@auraflow.co/gi, handle);

  return content;
}

// Select a template randomly from the offline database for the given category
function getOfflineTemplate(category) {
  const templates = OFFLINE_TEMPLATES[category];
  if (!templates || templates.length === 0) {
    // Ultimate fallback if category name is misaligned
    return {
      backgroundTheme: 'sensual_vibes',
      slides: [
        "Focus on your own chemistry, your desires, and your growth. Your worth is not defined by someone else's inability to see it. Reclaim your power."
      ],
      caption: "Reclaim your power. Build the chemistry that matters.\n\nSave this if you relate. ❦\n\n#attraction #selfworth #chemistry #growth"
    };
  }

  const randomIndex = Math.floor(Math.random() * templates.length);
  const selected = templates[randomIndex];
  
  // Clone to avoid mutation of source objects
  return {
    backgroundTheme: selected.backgroundTheme,
    slides: [...selected.slides],
    caption: selected.caption
  };
}

// Generates Reels content using Gemini API
async function generateAIReel(category, topicQuery, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const recentConstraintText = await getRecentConstraintText();

  const prompt = `
You are a master copywriter and viral growth strategist for an Instagram page named "Unspoken Desires" focusing on mature, 18+ relationship psychology, intense seduction, and physical/mental chemistry.
Your target audience consists of adults aged 20-35 who are deeply drawn to raw romantic tension, secret desires, modern situationships, physical intimacy, and unspoken thoughts that keep them awake at night.
The goal of this content is to act as an immediate trigger point—making readers feel a wave of attraction, romantic tension, or intense relatability that commands an immediate follow.

Generate a highly suggestive, high-tension vertical Instagram Reel script and caption for the category: "${category}".
${topicQuery ? `Base the content and theme on this trending topic/issue: "${topicQuery}".` : ''}
${recentConstraintText}

CRITICAL CONTENT INSTRUCTIONS:
- Writing Style: Deep, raw, highly suggestive, speaking DIRECTLY to the viewer watching the screen (using "You" and "Your"). Start with an immediate attention-grabbing hook in the first 2 seconds. It must build a strong emotional, highly seductive impact that registers in their minds and commands attention. Keep sentences extremely short, crisp, and heavy. Avoid formal AI transitions, greetings, or robotic filler. It must feel like an intimate secret or a private confession.
- Focus: Must address 18+ relationship themes (romantic/physical chemistry, adult dating dynamics, situationships, physical intimacy, secret thoughts, desire, overthinking, and heartbreak).
- titleText: A short, high-impact quote or statement to display on the video slide (max 15-20 words, uppercase, punchy, e.g. "THE DANGEROUS THRILL OF FORBIDDEN CHEMISTRY.").
- audioScript: The text narration for the voiceover. It must be emotionally deep, spoken naturally by the narrator, and run for about 15-30 seconds (around 45-75 words). It must sound like a real person sharing a raw, direct truth to the viewer (no greetings like "Hey everyone!", no formal AI buzzwords, no robotic sign-offs). Write simple, punchy, emotional sentences with natural breathing pauses. Do not include markdown, stage directions, or audio cues.
- backgroundTheme: Select a background visual theme from this list that best fits the mood: 'midnight_desire', 'rainy_bed', 'shadowy_lounge', 'candlelight_secrets', 'intimate_touch', 'overthinking_night', 'secret_thoughts', 'sensual_vibes'.
- caption: Generate a caption that starts with a hook, has an emotional insight, and ends with call-to-actions and a rich set of 8-10 high-performing hashtags.

Response must be valid JSON matching this schema:
\`\`\`json
{
  "backgroundTheme": "midnight_desire",
  "titleText": "Slide Text / Hook for the Reel Screen",
  "audioScript": "Deep, emotional text to be read by the narrator. Do not include markdown or stage directions.",
  "caption": "Full Instagram caption text..."
}
\`\`\`
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();
  const parsedData = JSON.parse(responseText);

  if (!parsedData.backgroundTheme || !parsedData.titleText || !parsedData.audioScript || !parsedData.caption) {
    throw new Error("Invalid structure returned by Gemini AI for Reel");
  }

  return parsedData;
}

export async function generateReelContent(category, topicQuery = null) {
  const settings = await db.getSettings();
  const apiKey = settings.geminiApiKey;

  await db.log('GENERATOR', `Generating Reel content for category: "${category}"...`);

  let content;
  if (apiKey) {
    try {
      content = await generateAIReel(category, topicQuery, apiKey);
      await db.log('GENERATOR', `Successfully generated AI Reel content using Gemini. Theme: "${content.backgroundTheme}"`);
    } catch (error) {
      await db.log('ERROR', `Gemini Reel generation failed: ${error.message}. Falling back to offline template.`);
      content = getOfflineReelFallback(category);
    }
  } else {
    await db.log('GENERATOR', `No Gemini API key found. Selecting an offline Reel template...`);
    content = getOfflineReelFallback(category);
  }

  // Double check page handle formatting in CTAs/caption
  const handle = settings.pageHandle || '@auraflow.co';
  content.titleText = content.titleText.replace(/@page_handle|@auraflow.co/gi, handle);
  content.caption = content.caption.replace(/@page_handle|@auraflow.co/gi, handle);

  return content;
}

// Convert post offline templates into reels format
function getOfflineReelFallback(category) {
  const postContent = getOfflineTemplate(category);
  // slide 1 as titleText
  // slides 2, 3, 4 as audioScript
  const titleText = postContent.slides[0];
  const audioScript = postContent.slides.slice(1, 4).join(' ').replace(/Swipe left|Read details|Swipe next/gi, '');
  return {
    backgroundTheme: postContent.backgroundTheme,
    titleText,
    audioScript,
    caption: postContent.caption
  };
}

export default {
  generatePostContent,
  generateReelContent
};
