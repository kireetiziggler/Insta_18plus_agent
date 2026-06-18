import { GoogleGenerativeAI } from '@google/generative-ai';
import db from './db.js';

// Pre-written, high-quality emotional templates for fallback/simulation mode
const OFFLINE_TEMPLATES = {
  'Anonymous Confessions': [
    {
      backgroundTheme: 'midnight_desire',
      pexelsQuery: 'couple standing very close lift elevator narrow space shadow low light night',
      slides: [
        `"Late Night Confession"\n\nWe stood in the cramped elevator as the doors slid shut.\nHis hands found my waist in the dark, pulling me flush against him.\n\n"We shouldn't," I whispered, but my hands were already finding his neck.\n\nHe smirked and pulled me closer, whispering, "Let them wait..." as his fingers slid under my shirt.`
      ],
      caption: "A single touch in the dark changes everything. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'intimate_touch',
      pexelsQuery: 'moody bar night couple romantic tension low light whispering',
      slides: [
        `"Midnight Whispers"\n\nI stood in the shadows, watching him slide his hand along her back at the bar.\nHe was tracing the lace of her dress the exact same way he does to mine when they think no one is looking.\n\nThe jealousy burned, but knowing I am his actual late-night secret is the ultimate high.`
      ],
      caption: "The beautiful torture of being his favorite secret. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'secret_thoughts',
      pexelsQuery: 'person looking phone bed silk sheets night bedroom glow dark',
      slides: [
        `"Late Night Texts"\n\nHis voice note detailed exactly what he’d do to me if we weren't separated by three thousand miles of ocean.\nNow I'm lying awake in the dark, tracing the path of his words along my collarbone.\n\nMy skin is aching for a touch that is completely out of reach.`
      ],
      caption: "Long distance makes the physical craving so much worse. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'shadowy_lounge',
      pexelsQuery: 'cozy couple sitting on couch screen glow phone intimacy night low light',
      slides: [
        `"Forbidden Desires"\n\nShe leaned close, her lips brushing my neck as she whispered a completely innocent joke.\nBut her fingers gripped my thigh tightly under the table.\n\nThe sudden heat between us in that crowded, dim lounge was pure sin.`
      ],
      caption: "A sudden whisper that changes everything. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    }
  ],
  'Intimate Secrets': [
    {
      backgroundTheme: 'secret_thoughts',
      pexelsQuery: 'person looking phone bed silk sheets night bedroom glow dark',
      slides: [
        `"Midnight Confession"\n\nHe sent me a picture of his chest with a text saying "wish your teeth were here."\nIt's 2 AM, and I've read it ten times, my heart racing as I imagine his collarbone against my lips.\n\nMy fingers trace my own lips in the dark, aching for him.`
      ],
      caption: "Late night texts that make it impossible to sleep. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'intimate_touch',
      pexelsQuery: 'couple hug goodbye street night lights close embrace shadow',
      slides: [
        `"Streetlight Whispers"\n\nEvery time we hug goodbye in the shadow of the streetlights, he slides his hand slightly under my shirt.\nHe traces the curve of my spine with a slow, heavy pressure.\n\nIt makes me forget the rest of the world. It’s our silent, dangerous promise.`
      ],
      caption: "A silent touch that promises everything. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'candlelight_secrets',
      pexelsQuery: 'hands touch candle light night table aesthetic dark romantic',
      slides: [
        `"Silent Desires"\n\nOur video call ended hours ago, but the screen glow is still warm.\nI close my eyes in the dark, tracing the memory of his hands on my skin.\n\nThe distance makes the physical craving feel like a ache I can't escape.`
      ],
      caption: "Tracing memories in the dark when the distance hurts. #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage"
    },
    {
      backgroundTheme: 'rainy_bed',
      pexelsQuery: 'cozy dark bedroom night rain street lights window bedroom silhouette',
      slides: [
        `"Late Night Confession"\n\nWe parked in the furthest corner of the lot, rain hammering the roof.\nSeeing her wedding ring glinting on the dashboard while her lips were on my neck felt like sin.\n\nHer hands slid under my shirt, and we both knew we had crossed the line.`
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
- Content Focus: The confession must describe a highly specific, detailed anonymous story about an intimate scene, secret affair, sex relationship, cheating, physical longing, or raw desire that happened in someone's life. It must make the reader feel the physical tension, heat, and raw chemistry ("high and horny" vibes).
- Tone & Mood: Seductive, passionate, extremely provocative, and raw.
- Content Format (STRICT DIALOGUE & STORYTELLING FORMAT):
  1. The first line of the confession MUST be a title in double quotes (e.g., "Late Night Confession", "Midnight Secret", "Forbidden Whispers", "Intimate Encounter").
  2. The story must follow below it, separated by paragraph breaks (using double newlines \n\n), written as a first-person dialogue/narrative script with short, heavy sentences.
  3. Spoken dialogue must be wrapped in double quotes.
  4. The final paragraph must build up to a highly suggestive, seductive punchline (dialogue or action) that leaves a lasting high/tension (e.g. "...washing the sheets everyday.", "...making sure the door was locked.").
  5. Write in first-person perspective only ("I", "me", "my", "we").
- Strict Ending Rule (NO QUESTIONS): DO NOT end the confession with any question. It must end as a provocative statement or dialogue quote.
- Word Count: Maximum length: 45-75 words (formatted into 3-5 short paragraphs separated by newlines \n\n).
- Compliance: Keep it highly suggestive but strictly compliant with Instagram safety guidelines (non-explicit, PG-13/R romance limit).
- Caption: Keep the caption extremely brief—exactly one provocative statement (max 10-15 words) describing the mood of the confession (no question), followed directly by 5-6 hashtags: #intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage. Do not include lists, bullet points, or multiple lines.
- Dynamic Search Query (CRITICAL VISUAL RULE): The "pexelsQuery" field must describe a highly specific search query representing the confession's exact scenario (e.g. kitchen counter, hotel bed, elevator corner, car backseat) in a dark, night, low-light, shadow, or silhouette environment to ensure the background fits the scene perfectly and stays unique. Never request bright daylight or sunny outdoor queries.

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
  "pexelsQuery": "descriptive query for AI image prompt...",
  "slides": [
    "\"Title In Quotes\"\n\nFirst paragraph narrative...\n\nSecond paragraph dialogue...\n\nFinal paragraph punchline."
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
  const bestReachHashtags = '#intimacy #chemistry #tension #forbiddenlove #unspokendesires #explorepage #viral #desire #relationshiptension #fyp #relationshipgoals #midnightthoughts #confessions';
  
  return `${firstLine} ${bestReachHashtags}`;
}

export async function generatePostContent(category, topicQuery = null) {
  const settings = await db.getSettings();
  const apiKey = settings.geminiApiKey;

  await db.log('GENERATOR', `Generating content for category: "${category}"...`);

  if (!apiKey) {
    const errorMsg = "CRITICAL ERROR: No Gemini API key found in settings. AI generation is strictly required.";
    await db.log('ERROR', errorMsg);
    throw new Error(errorMsg);
  }

  let content;
  try {
    content = await generateAIPost(category, topicQuery, apiKey);
    await db.log('GENERATOR', `Successfully generated AI content using Gemini. Theme: "${content.backgroundTheme}"`);
  } catch (error) {
    const errorMsg = `CRITICAL ERROR: Gemini content generation failed: ${error.message}. Fallback templates are disabled.`;
    await db.log('ERROR', errorMsg);
    throw new Error(errorMsg);
  }

  // Double check page handle formatting in CTAs
  const handle = settings.pageHandle || '@unspokendesireshub';
  content.slides = content.slides.map(slide => slide.replace(/@page_handle|@auraflow.co|@unspoken.desires.co/gi, handle));
  
  // Enforce single line caption with best reach hashtags
  content.caption = formatOneLineCaption(content.caption).replace(/@page_handle|@auraflow.co|@unspoken.desires.co/gi, handle);

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
The goal of this content is to act as an immediate trigger point—making readers feel the heat, tension, and suggestive desire of the moment ("high and horny" vibe).

Generate a highly suggestive, passionate, and high-tension vertical Instagram Reel script and caption for the category: "${category}".
${topicQuery ? `Base the content and theme on this trending topic/issue: "${topicQuery}".` : ''}
${recentConstraintText}

CRITICAL CONTENT INSTRUCTIONS:
- Content Focus: The Reel must describe a highly specific, detailed anonymous story sharing an intimate scene or secret that happened in someone's life to build suspense and viewer curiosity. It must strictly relate to suggestive intimacy, adult relationships, horny feelings, secret affairs, sex relationships, cheating, or physical longing.
- Tone & Mood: The tone must be highly sensual, passionate, seductive, and provocative (creating a "high and horny" mood through raw physical/emotional tension, secret cravings, and suggestive details), while staying within Instagram safety guidelines (non-explicit, PG-13/R romance limit).
- Writing Style (STRICT DIALOGUE & STORYTELLING FORMAT): Deep, raw, highly suggestive. Start with an immediate attention-grabbing title in quotes, followed by short, heavy sentences that combine narrative actions with direct spoken dialogue in double quotes. It must feel like an intimate secret or a private confession. Avoid formal AI transitions, greetings, or robotic filler.
- Perspective: First-person perspective only (using "I", "me", "my").
- Strict Ending Rule (NO QUESTIONS): DO NOT end the script with any question. It must end as a provocative statement or dialogue quote (e.g. "...washing the sheets everyday.", "...and we both knew we had crossed the line.").
- titleText: A short, high-impact quote or statement to display on the video slide (max 15-20 words, uppercase, punchy, e.g. "THE DANGEROUS THRILL OF FORBIDDEN CHEMISTRY.").
- audioScript: The text narration for the voiceover. It must describe the full story in vivid detail, using double quotes for spoken parts, and run for about 15-30 seconds (around 45-75 words). It must sound like a real person sharing a raw, direct secret/confession (no greetings like "Hey everyone!", no formal AI buzzwords, no robotic sign-offs, no questions at the end). Write simple, punchy, emotional sentences with natural breathing pauses. Do not include markdown, stage directions, or audio cues.
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

  await db.log('GENERATOR', `Generating Reel content for category: "${category}"...`);

  if (!apiKey) {
    const errorMsg = "CRITICAL ERROR: No Gemini API key found in settings. AI Reels generation is strictly required.";
    await db.log('ERROR', errorMsg);
    throw new Error(errorMsg);
  }

  let content;
  try {
    content = await generateAIReel(category, topicQuery, apiKey);
    await db.log('GENERATOR', `Successfully generated AI Reel content using Gemini. Theme: "${content.backgroundTheme}"`);
  } catch (error) {
    const errorMsg = `CRITICAL ERROR: Gemini Reel generation failed: ${error.message}. Fallback templates are disabled.`;
    await db.log('ERROR', errorMsg);
    throw new Error(errorMsg);
  }

  // Double check page handle formatting in CTAs/caption
  const handle = settings.pageHandle || '@unspokendesireshub';
  content.titleText = content.titleText.replace(/@page_handle|@auraflow.co|@unspoken.desires.co/gi, handle);
  content.caption = content.caption.replace(/@page_handle|@auraflow.co|@unspoken.desires.co/gi, handle);

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
