import { GoogleGenerativeAI } from '@google/generative-ai';
import db from './db.js';

// Pre-written, high-quality emotional templates for fallback/simulation mode
const OFFLINE_TEMPLATES = {
  'Desire & Physical Intimacy': [
    {
      backgroundTheme: 'midnight_desire',
      slides: [
        "The unspoken rules of physical chemistry.",
        "It's not just about touch. It's the silent glance across a room, the way their voice drops when they get close, and the sudden heat that makes your heart race.",
        "Most people mistake lust for attraction. But true desire is psychological. It starts in the mind long before it reaches the hands.",
        "Never settle for someone who only wants your presence, but has no interest in exploring your depth. True chemistry is rare and obsessive.",
        "Save this if you feel the pull. ❦\nFollow for more unspoken desires."
      ],
      caption: "Physical chemistry is a language spoken in silence. It's the unspoken pull that you can't ignore. True desire goes deeper than the surface. Explore the psychology of attraction.\n\nSave this if you relate. ❦\n\n#unspokendesires #chemistry #desire #intimacy #romance #attraction #relationshipgoals #psychology"
    }
  ],
  'Secret Thoughts & Overthinking': [
    {
      backgroundTheme: 'secret_thoughts',
      slides: [
        "The thoughts keeping you awake at 2 AM.",
        "You check their active status. You replay the touch, the whisper, the way their hands felt on your skin. You want to ask if they felt the same pull, but instead, you stay silent.",
        "We hide our deepest desires because we are terrified of the power they give someone else over us.",
        "Stop dissecting silence. Silence is an answer, too. Reclaim your self-respect and put the phone down. Let them match your energy or let them go.",
        "Save this for quiet nights. ❣\nFollow for relationship secrets."
      ],
      caption: "Overthinking is the art of creating problems that don't exist. If they wanted to, they would. Protect your peace of mind and stop dissecting silence.\n\nSave this for difficult nights. ❣\n\n#overthinking #modernrelationship #texting #datingstruggles #datingadvice #selfworth #mentalpeace #datingrules"
    }
  ],
  'Situationships & Forbidden Love': [
    {
      backgroundTheme: 'shadowy_lounge',
      slides: [
        "The dangerous thrill of forbidden chemistry.",
        "You act like partners when you're alone. The touch is addictive, but the silence between encounters is deafening. You know it's a mistake, but you can't walk away.",
        "You tolerate the uncertainty because you're terrified of losing them. But you are slowly breaking your own heart by accepting physical connection in place of emotional safety.",
        "You cannot love someone into being ready. Choosing to walk away from a situationship isn't giving up; it's choosing self-respect over crumbs.",
        "Share this with someone who needs it. ❥\nFollow for relationship growth."
      ],
      caption: "A situationship is just a relationship where one person gets all the benefits while the other gets all the anxiety. Set boundaries and walk away when it stings.\n\nShare this with someone who needs to see this. ❥\n\n#situationship #heartbreak #datingproblems #modernlove #selflove #relationshiprules #relationshippsychology #healing"
    }
  ],
  'Romantic Tension & Chemistry': [
    {
      backgroundTheme: 'candlelight_secrets',
      slides: [
        "The magnetics of unspoken tension.",
        "Accidental brushes of skin. Eye contact across a crowded room that lasts a second too long. You both know it, but neither will say it.",
        "Chemistry is the absolute certainty that if you get any closer, you won't be able to stop. That silent, high-contrast pull is the most addictive part of modern dating.",
        "Enjoy the tension, but don't play games forever. Raw chemistry is a spark, but emotional safety is what keeps the fire burning.",
        "Save this for late nights. ❥\nFollow for dating chemistry."
      ],
      caption: "Unspoken tension is the ultimate prelude. It's the spark before the fire. Appreciate the chemistry, but build the connection.\n\nSave this for late nights. ❥\n\n#romantictension #attractioncode #chemistry #datingadvice #secretcrush #lovequotes #sensualvibes #datingcoach"
    }
  ],
  'Intimate Heartbreak & Healing': [
    {
      backgroundTheme: 'overthinking_night',
      slides: [
        "When the bed feels too cold.",
        "You don't just miss their voice; you miss the heat of their breath, the quiet intimacy of late-night secrets, the way they held you when you were asleep.",
        "Sometimes, coldness is a shield, not a lack of care. People act cold because sitting with the warmth of what they lost hurts too much.",
        "Stop looking for closure in the person who broke you. Let them be cold. Focus on your own warmth, your healing, and your growth.",
        "Save this if you are healing. ✦\nFollow for emotional strength."
      ],
      caption: "Closure doesn't come from them; it comes from you. Forgive the silence, accept the coldness, and heal. Your worth is not defined by their inability to see it.\n\nSave this if you are healing. ✦\n\n#heartbreak #breakup #healingjourney #coldshoulder #movingon #selfworth #closure #emotionalgrowth #selflove"
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
You are a master copywriter and viral growth strategist for an Instagram page named "Unspoken Desires" focusing on mature, 18+ relationship psychology, intense seduction, and physical/mental chemistry.
Your target audience consists of adults aged 20-35 who are deeply drawn to raw romantic tension, secret desires, modern situationships, physical intimacy, and unspoken thoughts that keep them awake at night.
The goal of this content is to act as an immediate trigger point—making readers feel a wave of attraction, romantic tension, or intense relatability that commands an immediate follow.

Generate a highly suggestive, high-tension 5-slide carousel post and caption for the category: "${category}".
${topicQuery ? `Base the content and theme on this trending topic/issue: "${topicQuery}".` : ''}
${examplesText}
${recentConstraintText}

CRITICAL CONTENT INSTRUCTIONS:
- Writing Style: Deep, raw, highly suggestive, and emotionally charged (18+). Use short, heavy, punchy sentences. It must feel like a quiet confession, an intimate secret shared in the dark, or a raw psychological truth about physical desire, attraction, and chemistry.
- Tone: Extremely magnetic, seductive, and provocative (within safety guidelines: strictly non-explicit and non-pornographic, but high-tension PG-13/R-rated romance). It should trigger a strong emotional and physical response (goosebumps, heart racing, intense familiarity).
- Slide 1: Unresistable emotional hook targeting secret desire, forbidden attraction, or magnetic chemistry (e.g., "The dangerous thrill of forbidden chemistry.", "Read this if you check their profile at 2 AM.", "What happens when the tension becomes too heavy to ignore.")
- Slide 2: High-contrast, deeply relatable scenario painting a vivid picture of physical proximity, touch, or longing.
- Slide 3: Seductive psychological truth or realization about physical/mental chemistry.
- Slide 4: An intense mindset realization, boundary shift, or realization of mutual obsession.
- Slide 5: Strong converting call to action utilizing elegant symbols (❦, ❣, ❥, ✦) instead of generic emojis, instructing the user to save/share and follow @unspoken.desires.co for more.

Select a background visual theme from this list that best fits the mood:
- 'midnight_desire' (for romantic chemistry, intimacy, physical connection)
- 'rainy_bed' (for midnight thoughts, quiet intimacy, rain views)
- 'shadowy_lounge' (for modern dating, luxury bar scenes, romantic tension)
- 'candlelight_secrets' (for soft candlelight, close chemistry, secret touch)
- 'intimate_touch' (for deep connection, physical touch, embrace)
- 'overthinking_night' (for night reflections, car window thoughts, cold attitude)
- 'secret_thoughts' (for late-night overthinking, phone screen glow, silk bed)
- 'sensual_vibes' (for abstract gold and crimson luxury textures)

Generate a caption that starts with a hook, has an emotional insight, lists a key lesson, and ends with call-to-actions (Save, Share, Tag, Follow) and a rich set of 8-10 high-performing hashtags (mix of broad and niche).

Response must be valid JSON matching this schema:
\`\`\`json
{
  "backgroundTheme": "midnight_desire",
  "slides": [
    "Slide 1 Hook text",
    "Slide 2 Relatable Situation text",
    "Slide 3 Deep Realization text",
    "Slide 4 Mindset Shift / Lesson text",
    "Slide 5 CTA text"
  ],
  "caption": "Full Instagram caption text..."
}
\`\`\`
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();
  const parsedData = JSON.parse(responseText);

  // Validate structures
  if (!parsedData.backgroundTheme || !Array.isArray(parsedData.slides) || parsedData.slides.length !== 5 || !parsedData.caption) {
    throw new Error("Invalid structure returned by Gemini AI");
  }

  return parsedData;
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
  content.caption = content.caption.replace(/@page_handle|@auraflow.co/gi, handle);

  return content;
}

// Select a template randomly from the offline database for the given category
function getOfflineTemplate(category) {
  const templates = OFFLINE_TEMPLATES[category];
  if (!templates || templates.length === 0) {
    // Ultimate fallback if category name is misaligned
    return {
      backgroundTheme: 'personal_growth',
      slides: [
        "One day you will understand.",
        "You are struggling right now. Everything feels heavy, and you aren't sure if you can make it through the week.",
        "But pain is a master teacher. The fire you are walking through isn't burning you; it is refining you.",
        "Keep going. Discipline is doing what needs to be done even when you feel like quitting.",
        "Save this for later ❤️\nFollow for daily strength."
      ],
      caption: "Keep moving forward. The storm will pass, and you will stand stronger.\n\nSave this for later ❤️\n\n#motivation #mindset #growth #discipline #strength"
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
