import { GoogleGenerativeAI } from '@google/generative-ai';
import db from './db.js';

// Pre-written, high-quality emotional templates for fallback/simulation mode
const OFFLINE_TEMPLATES = {
  'Anonymous Confessions': [
    {
      backgroundTheme: 'midnight_desire',
      pexelsQuery: 'couple standing very close lift elevator narrow space shadow low light night',
      slides: [
        "His hands found my waist in the dark elevator. We didn't say a word, but the way he pulled me against him confirmed the affair we'd been denying for months."
      ],
      caption: "A single touch in the dark changes everything. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'intimate_touch',
      pexelsQuery: 'moody bar night couple romantic tension low light whispering',
      slides: [
        "I watched him touch her arm at the bar, the exact same way he touches mine when his wife isn't looking. The jealousy burned, but our secret remains the real drug."
      ],
      caption: "The beautiful torture of being his favorite secret. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'secret_thoughts',
      pexelsQuery: 'person looking phone bed silk sheets night bedroom glow dark',
      slides: [
        "He sent a voice note detailing exactly what he’d do to me if we weren't three thousand miles apart. Now I'm staring at the bedroom ceiling in the dark, completely aching for him."
      ],
      caption: "Long distance makes the physical craving so much worse. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'shadowy_lounge',
      pexelsQuery: 'cozy couple sitting on couch screen glow phone intimacy night low light',
      slides: [
        "She whispered his name while her lips brushed my neck, but we both knew she was thinking of me. The heat between us in that crowded lounge was absolute sin."
      ],
      caption: "A sudden whisper that changes everything. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    }
  ],
  'Intimate Secrets': [
    {
      backgroundTheme: 'secret_thoughts',
      pexelsQuery: 'person looking phone bed silk sheets night bedroom glow dark',
      slides: [
        "He sent me a picture of his chest with a text saying 'wish your teeth were here'. It's 2 AM, and I've read it ten times while tracing my own lips in the dark."
      ],
      caption: "Late night texts that make it impossible to sleep. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'intimate_touch',
      pexelsQuery: 'couple hug goodbye street night lights close embrace shadow',
      slides: [
        "Every time we hug goodbye in the shadow of the streetlights, he slips his hand slightly under my shirt, tracing my spine in a silent promise of what's to come."
      ],
      caption: "A silent touch that promises everything. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'candlelight_secrets',
      pexelsQuery: 'hands touch candle light night table aesthetic dark romantic',
      slides: [
        "Our call ended hours ago, but the memory of his hands remains. I closed my eyes in the dark, imagining his touch on my skin until the longing became physical pain."
      ],
      caption: "Tracing memories in the dark when the distance hurts. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'rainy_bed',
      pexelsQuery: 'cozy dark bedroom night rain street lights window bedroom silhouette',
      slides: [
        "We parked in the furthest corner of the lot, rain hammering the roof. Seeing her wedding ring on the dashboard while her lips were on my neck felt like a beautiful, dangerous sin."
      ],
      caption: "A dangerous game of forbidden attraction. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    }
  ]
};

// Helper to get recent post hooks as a negative constraint for Gemini
async function getRecentConstraintText() {
  try {
    const posts = await db.getPosts();
    if (!posts || posts.length === 0) return "";
    
    // Get the last 30 posts/reels to exclude their hooks/lines
    const recentHooks = posts
      .slice(-30)
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
You are a master copywriter and viral growth strategist for the Instagram page "@unspokendesireshub" focusing on sharing anonymous confessions that describe secret intimacy scenes from a random person's life.
The goal of this content is to maximize follows, shares, saves, comments, and profile visits by presenting raw, private thoughts that make viewers feel the heat, tension, and suggestive desire of the moment.

Generate an incredibly suggestive, passionate, and high-tension single-slide post (not a multi-slide carousel) and caption for the category: "${category}".
${topicQuery ? `Base the content and theme on this trending topic/issue: "${topicQuery}".` : ''}
${examplesText}
${recentConstraintText}

CRITICAL CONFESSION CONTENT RULES:
- Content Focus: The confession must be a realistic anonymous story describing an intimate scene/secret that happened in someone's life. It must strictly relate to suggestive intimacy, adult relationships, horny feelings, secret affairs, sex relationships, cheating, or physical longing.
- Tone & Mood: The tone must be highly sensual, passionate, seductive, and provocative (creating a "horny mood" through raw physical/emotional tension, secret cravings, and suggestive details), while staying within Instagram safety guidelines (non-explicit, PG-13/R romance limit).
- Content Format: Write the post as a realistic first-person anonymous story representing the person who lived it. Start immediately with the confession text itself (e.g., "We met at his apartment while his wife was away...", "He backed me against the kitchen counter..."). Do not add any introductory text like "Some random person said" or "Anonymous confession".
- Perspective: First-person perspective only (using "I", "me", "my"). Vary between male and female perspectives (50% male, 50% female).
- Hook Rule: The first sentence must instantly create curiosity and grab attention (e.g., "His hands found my waist in the dark elevator...").
- Strict Ending Rule (NO QUESTIONS): DO NOT end the confession with any question. It must end as a normal statement of fact describing the scene or the feeling (e.g., "...and we both knew we had crossed the line.", "...leaving me breathless in the dark.").
- No Clutter: STRICTLY PROHIBITED: NO titles, NO headings, NO labels, NO introductions, NO volume numbers, NO decorative separators.
- Word Count: Maximum length: 20-35 words (strictly short and sharp).
- Compliance: Keep it suggestive but strictly compliant with Instagram safety guidelines (non-explicit, PG-13/R romance limit).
- Caption: Keep the caption extremely brief—exactly one provocative statement (max 10-15 words) describing the mood of the confession (no question), followed directly by 5-6 hashtags: #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage. Do not include lists, bullet points, or multiple lines.
- Dynamic Search Query (CRITICAL VISUAL RULE): The "pexelsQuery" field must describe a highly specific, synced search query representing the confession's exact scenario (e.g. kitchen counter, hotel bed, elevator corner, car backseat) in a dark, night, low-light, shadow, or silhouette environment to ensure the background fits the scene perfectly and stays unique. Never request bright daylight or sunny outdoor queries. Example queries:
  - "couple kitchen counter shadow low light night"
  - "hotel bedroom bed sheets silhouette night dim light"
  - "couple backseat car window rain street lights night"
  - "couple standing very close lift elevator narrow space shadow low light night"

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
  "pexelsQuery": "descriptive query for pexels search...",
  "slides": [
    "Full confession text starting immediately with the hook and ending with the statement."
  ],
  "caption": "One line caption text #intimacy #chemistry..."
}
\`\`\`
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();
  const parsedData = JSON.parse(responseText);

  // Validate structures
  if (!parsedData.backgroundTheme || !parsedData.pexelsQuery || !Array.isArray(parsedData.slides) || parsedData.slides.length !== 1 || !parsedData.caption) {
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
  const posts = await db.getPosts();

  await db.log('GENERATOR', `Generating content for category: "${category}"...`);

  let content;
  if (apiKey) {
    try {
      content = await generateAIPost(category, topicQuery, apiKey);
      await db.log('GENERATOR', `Successfully generated AI content using Gemini. Theme: "${content.backgroundTheme}"`);
    } catch (error) {
      await db.log('ERROR', `Gemini content generation failed: ${error.message}. Falling back to offline template.`);
      content = getOfflineTemplate(category, posts);
    }
  } else {
    await db.log('GENERATOR', `No Gemini API key found. Selecting a high-quality offline template...`);
    content = getOfflineTemplate(category, posts);
  }

  // Double check page handle formatting in CTAs
  const handle = settings.pageHandle || '@auraflow.co';
  content.slides = content.slides.map(slide => slide.replace(/@page_handle|@auraflow.co/gi, handle));
  
  // Enforce single line caption with best reach hashtags
  content.caption = formatOneLineCaption(content.caption).replace(/@page_handle|@auraflow.co/gi, handle);

  return content;
}

// Select an unused template from the offline database for the given category to prevent repetition
function getOfflineTemplate(category, posts = []) {
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

  // Find already used templates by comparing slide content
  const usedTexts = new Set(posts.map(p => p.slides ? p.slides[0] : ''));
  const unusedTemplates = templates.filter(t => !usedTexts.has(t.slides[0]));

  // Fallback to full templates pool if all have been used
  const pool = unusedTemplates.length > 0 ? unusedTemplates : templates;
  const randomIndex = Math.floor(Math.random() * pool.length);
  const selected = pool[randomIndex];
  
  // Clone to avoid mutation of source objects
  return {
    backgroundTheme: selected.backgroundTheme,
    pexelsQuery: selected.pexelsQuery || null,
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
You are a master copywriter and viral growth strategist for an Instagram page named "Unspoken Desires" focusing on sharing anonymous confessions that describe secret intimacy scenes from a random person's life.
Your target audience consists of adults aged 20-35 who are deeply drawn to raw romantic tension, secret desires, modern situationships, physical intimacy, and unspoken thoughts that keep them awake at night.
The goal of this content is to act as an immediate trigger point—making readers feel the heat, tension, and suggestive desire of the moment.

Generate a highly suggestive, passionate, and high-tension vertical Instagram Reel script and caption for the category: "${category}".
${topicQuery ? `Base the content and theme on this trending topic/issue: "${topicQuery}".` : ''}
${recentConstraintText}

CRITICAL CONTENT INSTRUCTIONS:
- Content Focus: The Reel must describe a realistic anonymous story sharing an intimate scene/secret that happened in someone's life, specifically related to suggestive intimacy, adult relationships, horny feelings, secret affairs, sex relationships, cheating, or physical longing.
- Tone & Mood: The tone must be highly sensual, passionate, seductive, and provocative (creating a "horny mood" through raw physical/emotional tension, secret cravings, and suggestive details), while staying within Instagram safety guidelines (non-explicit, PG-13/R romance limit).
- Writing Style: Deep, raw, highly suggestive. Start with an immediate attention-grabbing hook in the first 2 seconds. It must build a strong emotional, highly seductive impact. Keep sentences extremely short, crisp, and heavy. Avoid formal AI transitions, greetings, or robotic filler. It must feel like an intimate secret or a private confession.
- Perspective: First-person perspective only (using "I", "me", "my").
- Strict Ending Rule (NO QUESTIONS): DO NOT end the script with any question. It must end as a normal statement of fact (e.g., "...and we both knew we had crossed the line.", "...leaving me breathless in the dark.").
- titleText: A short, high-impact quote or statement to display on the video slide (max 15-20 words, uppercase, punchy, e.g. "THE DANGEROUS THRILL OF FORBIDDEN CHEMISTRY.").
- audioScript: The text narration for the voiceover. It must be emotionally deep, spoken naturally by the narrator, and run for about 15-30 seconds (around 45-75 words). It must sound like a real person sharing a raw, direct secret/confession (no greetings like "Hey everyone!", no formal AI buzzwords, no robotic sign-offs, no questions at the end). Write simple, punchy, emotional sentences with natural breathing pauses. Do not include markdown, stage directions, or audio cues.
- backgroundTheme (CRITICAL VISUAL RULE): Select a background visual theme from this list that best fits the mood. Ensure it is strictly a dark, night, or low-light theme. Never select bright themes:
  - 'midnight_desire' (for romantic chemistry, intimacy, physical connection, dark low light)
  - 'rainy_bed' (for midnight thoughts, quiet intimacy, rain views, dark night)
  - 'shadowy_lounge' (for modern dating, luxury bar scenes, romantic tension, night low light)
  - 'candlelight_secrets' (for soft candlelight, close chemistry, secret touch, dark romantic)
  - 'intimate_touch' (for deep connection, physical touch, embrace, low light night)
  - 'overthinking_night' (for night reflections, car window thoughts, night shadow)
  - 'secret_thoughts' (for late-night overthinking, phone screen glow, silk bed, dark glow)
  - 'sensual_vibes' (for abstract gold and crimson luxury textures, dark red/gold)
- caption: Generate a caption that starts with a provocative statement (no question), followed by call-to-actions and a rich set of 8-10 high-performing hashtags including #intimacy #chemistry #tension #forbiddenlove #unspokendesires.

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
  const posts = await db.getPosts();

  await db.log('GENERATOR', `Generating Reel content for category: "${category}"...`);

  let content;
  if (apiKey) {
    try {
      content = await generateAIReel(category, topicQuery, apiKey);
      await db.log('GENERATOR', `Successfully generated AI Reel content using Gemini. Theme: "${content.backgroundTheme}"`);
    } catch (error) {
      await db.log('ERROR', `Gemini Reel generation failed: ${error.message}. Falling back to offline template.`);
      content = getOfflineReelFallback(category, posts);
    }
  } else {
    await db.log('GENERATOR', `No Gemini API key found. Selecting an offline Reel template...`);
    content = getOfflineReelFallback(category, posts);
  }

  // Double check page handle formatting in CTAs/caption
  const handle = settings.pageHandle || '@auraflow.co';
  content.titleText = content.titleText.replace(/@page_handle|@auraflow.co/gi, handle);
  content.caption = content.caption.replace(/@page_handle|@auraflow.co/gi, handle);

  return content;
}

// Convert post offline templates into reels format, using used history
function getOfflineReelFallback(category, posts = []) {
  const postContent = getOfflineTemplate(category, posts);
  // slide 1 as titleText
  // slides 2, 3, 4 as audioScript
  const titleText = postContent.slides[0];
  const audioScript = postContent.slides.slice(1, 4).join(' ').replace(/Swipe left|Read details|Swipe next/gi, '').trim() || titleText;
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
