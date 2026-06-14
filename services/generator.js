import { GoogleGenerativeAI } from '@google/generative-ai';
import db from './db.js';

// Pre-written, high-quality emotional templates for fallback/simulation mode
const OFFLINE_TEMPLATES = {
  'Anonymous Confessions': [
    {
      backgroundTheme: 'midnight_desire',
      pexelsQuery: 'couple standing very close lift elevator narrow space shadow low light night',
      slides: [
        "His hands found my waist in the dark elevator. We didn't say a word, but the way he pulled me against him told me everything we’d been hiding for months. Should we stop? ❦"
      ],
      caption: "Sometimes a single touch is enough to start a fire. Have you ever felt a connection so intense it scared you? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'intimate_touch',
      pexelsQuery: 'moody bar night couple romantic tension low light whispering',
      slides: [
        "I watched him touch her arm at the bar, the exact same way he touches mine when no one is looking. The jealousy burned, but the thrill of being his actual secret is intoxicating. What do I do? ❦"
      ],
      caption: "The beautiful torture of secret jealousy. Have you ever been someone's favorite secret? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'secret_thoughts',
      pexelsQuery: 'person looking phone bed silk sheets night bedroom glow dark',
      slides: [
        "He sent a voice note describing exactly what he’d do to me if he weren't three thousand miles away. Now I'm staring at the ceiling in the dark, my body aching for a touch that isn't here. Have you felt this? ❦"
      ],
      caption: "Distance makes the craving so much worse. How do you handle long distance desire? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'shadowy_lounge',
      pexelsQuery: 'cozy couple sitting on couch screen glow phone intimacy night low light',
      slides: [
        "She whispered a secret in my ear, her lips brushing my neck. My breath caught, and for a second, I forgot we were in a room full of people. I want her. Should I tell her? ❦"
      ],
      caption: "A whisper that changes everything. How do you handle sudden attraction? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    }
  ],
  'Intimate Secrets': [
    {
      backgroundTheme: 'secret_thoughts',
      pexelsQuery: 'person looking phone bed silk sheets night bedroom glow dark',
      slides: [
        "He sent me a picture of his collarbone with a text saying 'wish your teeth were here'. It's 2 AM, and I've read it ten times. How am I supposed to sleep now? ❣"
      ],
      caption: "Late night texts that keep you awake. What's the most suggestive text you've received? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'intimate_touch',
      pexelsQuery: 'couple hug goodbye street night lights close embrace shadow',
      slides: [
        "Every time we hug goodbye, he slips his hand slightly under my shirt, just tracing my spine. It’s our silent promise. Is it wrong to want more? ❣"
      ],
      caption: "A silent touch that promises everything. Are you waiting for them to make the first move? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'candlelight_secrets',
      pexelsQuery: 'hands touch candle light night table aesthetic dark romantic',
      slides: [
        "Our video call ended an hour ago, but the screen glow is still warm. I close my eyes and trace the memory of his hands on my skin. Distance makes the craving so much worse. How do you handle it? ❣"
      ],
      caption: "Tracing memories in the dark. Have you ever craved someone's presence so badly it hurt? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'rainy_bed',
      pexelsQuery: 'cozy dark bedroom night rain street lights window bedroom silhouette',
      slides: [
        "We parked in the furthest corner of the lot, rain hammering the roof. Seeing her wedding ring on the dashboard while her lips were on my neck felt like a beautiful, dangerous sin. Should I walk away? ❣"
      ],
      caption: "A dangerous game with high stakes. Would you walk away from a forbidden attraction? #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
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
You are a master copywriter and viral growth strategist for the Instagram page "@unspokendesireshub" focusing on anonymous, highly relatable relationship confessions, secret thoughts, and raw romantic tension.
The goal of this content is to maximize follows, shares, saves, comments, and profile visits by presenting raw, private thoughts that make viewers pause, relate, and feel like: "Wait... this sounds exactly like me."

Generate an incredibly suggestive, passionate, and high-tension single-slide post (not a multi-slide carousel) and caption for the category: "${category}".
${topicQuery ? `Base the content and theme on this trending topic/issue: "${topicQuery}".` : ''}
${examplesText}
${recentConstraintText}

CRITICAL CONFESSION CONTENT RULES:
- Content Focus: The confession must strictly relate to intense physical/emotional intimacy, jealousy of affairs (thrill or pain of secret love), or long-distance intimacy (craving touch, late-night texting, physical longing).
- Tone & Mood: The tone must be highly sensual, seductive, and provocative (creating a "horny mood" through raw physical tension, craving, and suggestive details), while staying within Instagram safety guidelines (non-explicit, PG-13/R romance limit).
- Content Format: Write the post as a realistic, anonymous confession-style story. Start immediately with the confession.
- Perspective: First-person perspective only (using "I", "me", "my"). Vary between male and female perspectives (50% male, 50% female).
- Hook Rule: The first sentence must instantly create curiosity (e.g., "His hands found my waist in the dark elevator...").
- Ending Rule: End the confession with a provocative, comment-generating question (e.g., "Am I reading too much into this?", "Would you tell her?", "Should I let it go?", "Have you ever felt this?", "What would you do?").
- No Clutter: STRICTLY PROHIBITED: NO titles, NO headings, NO labels, NO introductions, NO volume numbers, NO decorative separators.
- Word Count: Maximum length: 20-35 words (strictly short and sharp).
- Compliance: Keep it suggestive but strictly compliant with Instagram safety guidelines (non-explicit, PG-13/R romance limit).
- Caption: Keep the caption extremely brief—exactly one provocative line (max 10-15 words) asking an engaging question or hook, followed directly by 5-6 hashtags: #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage. Do not include lists, bullet points, or multiple lines.
- Dynamic Search Query (CRITICAL VISUAL RULE): The "pexelsQuery" field must strictly query for a dark, night, or low-light scene (e.g., night-time bedroom, shadowy elevator, dim candle light, street lights in rain, dark silhouettes). Never request bright daylight, sunny outdoor, or studio lighting queries. The viewer should understand the mood BEFORE reading the text. For example:
  - "couple standing very close lift elevator narrow space shadow low light night"
  - "moody bar night couple romantic tension low light whispering"
  - "person looking phone bed silk sheets night bedroom glow dark"
  - "cozy couple sitting on couch screen glow phone intimacy night low light"
  - "cozy dark bedroom night rain street lights window bedroom silhouette"
  - "hands touch candle light night table aesthetic dark romantic"

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
    "Full confession text starting immediately with the hook and ending with the comment-generating question."
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
The goal of this content is to act as an immediate trigger point—making readers feel a wave of attraction, romantic tension, or intense relatability (a "horny mood" through raw physical tension, craving, and suggestive details) that commands an immediate follow.

Generate a highly suggestive, passionate, and high-tension vertical Instagram Reel script and caption for the category: "${category}".
${topicQuery ? `Base the content and theme on this trending topic/issue: "${topicQuery}".` : ''}
${recentConstraintText}

CRITICAL CONTENT INSTRUCTIONS:
- Content Focus: The Reel must strictly relate to intense physical/emotional intimacy, jealousy of affairs (thrill or pain of secret love), or long-distance intimacy (craving touch, late-night texting, physical longing).
- Tone & Mood: The tone must be highly sensual, seductive, and provocative, speaking DIRECTLY to the viewer watching the screen (using "You" and "Your") while staying within Instagram safety guidelines (non-explicit, PG-13/R romance limit).
- Writing Style: Deep, raw, highly suggestive. Start with an immediate attention-grabbing hook in the first 2 seconds. It must build a strong emotional, highly seductive impact. Keep sentences extremely short, crisp, and heavy. Avoid formal AI transitions, greetings, or robotic filler. It must feel like an intimate secret or a private confession.
- Focus: Must address 18+ relationship themes (romantic/physical chemistry, adult dating dynamics, situationships, physical intimacy, secret thoughts, desire, overthinking, and heartbreak).
- titleText: A short, high-impact quote or statement to display on the video slide (max 15-20 words, uppercase, punchy, e.g. "THE DANGEROUS THRILL OF FORBIDDEN CHEMISTRY.").
- audioScript: The text narration for the voiceover. It must be emotionally deep, spoken naturally by the narrator, and run for about 15-30 seconds (around 45-75 words). It must sound like a real person sharing a raw, direct truth to the viewer (no greetings like "Hey everyone!", no formal AI buzzwords, no robotic sign-offs). Write simple, punchy, emotional sentences with natural breathing pauses. Do not include markdown, stage directions, or audio cues.
- backgroundTheme (CRITICAL VISUAL RULE): Select a background visual theme from this list that best fits the mood. Ensure it is strictly a dark, night, or low-light theme. Never select bright themes:
  - 'midnight_desire' (for romantic chemistry, intimacy, physical connection, dark low light)
  - 'rainy_bed' (for midnight thoughts, quiet intimacy, rain views, dark night)
  - 'shadowy_lounge' (for modern dating, luxury bar scenes, romantic tension, night low light)
  - 'candlelight_secrets' (for soft candlelight, close chemistry, secret touch, dark romantic)
  - 'intimate_touch' (for deep connection, physical touch, embrace, low light night)
  - 'overthinking_night' (for night reflections, car window thoughts, night shadow)
  - 'secret_thoughts' (for late-night overthinking, phone screen glow, silk bed, dark glow)
  - 'sensual_vibes' (for abstract gold and crimson luxury textures, dark red/gold)
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
