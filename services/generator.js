import { GoogleGenerativeAI } from '@google/generative-ai';
import db from './db.js';

// Pre-written, high-quality emotional templates for fallback/simulation mode
const OFFLINE_TEMPLATES = {
  'Desire & Physical Intimacy': [
    {
      backgroundTheme: 'midnight_desire',
      slides: [
        "We both know how this ends. The slow, deliberate drag of my hand sliding down your back, pulling you in until there is no space left between us. Your breath hitches, and in that second, we both stop pretending we're just friends. ❦"
      ],
      caption: "The exact moment friendship burns into something undeniable. True desire is a physical pull you cannot ignore. Replay the touch, feel the heat.\n\nSave this for late night chemistry. ❦\n\n#unspokendesires #chemistry #desire #intimacy #romance #attraction #tension #forbiddenlove"
    },
    {
      backgroundTheme: 'intimate_touch',
      slides: [
        "The way you look at me when you think I'm not paying attention. The heat of your hand resting on my thigh, sending shivers straight to my core. We haven't even kissed yet, but our skin is already whispering promises we won't be able to keep. ❦"
      ],
      caption: "An unspoken conversation between two bodies. The tension is too heavy to ignore. Tag the one who makes your skin burn.\n\nSave this for late night chemistry. ❦\n\n#intimacy #passion #attraction #chemistry #secretcrush #lovequotes #seduction"
    },
    {
      backgroundTheme: 'sensual_vibes',
      slides: [
        "Locking eyes in the dark. The sound of your breathing getting heavier as I slide my fingers through your hair, tilting your face up to mine. No words, just the quiet rush of blood and the absolute surrender to what we both desperately want. ❦"
      ],
      caption: "True intimacy starts in the eyes and ends in complete surrender. You can try to fight it, but the pull is too strong.\n\nSave this if you crave this level of connection. ❦\n\n#sensualvibes #magneticconnection #surrender #intimacy #lovequotes #latenighthoughts"
    },
    {
      backgroundTheme: 'midnight_desire',
      slides: [
        "The texture of your skin under my fingertips. The way you arch into my touch, seeking more warmth, as my lips trace the sensitive curve of your neck. It's a sweet, silent torture, and neither of us wants it to stop. ❦"
      ],
      caption: "A silent symphony of touch. Every shiver tells a story. We don't need labels when the connection is this raw.\n\nShare this with the one you want to trace. ❦\n\n#touch #passion #relationshipgoals #midnightdesires #chemistry #tension"
    }
  ],
  'Secret Thoughts & Overthinking': [
    {
      backgroundTheme: 'secret_thoughts',
      slides: [
        "You're overthinking it, but you still want it. The memory of my fingers tracing your collarbone, the sudden heat of my breath against your neck, and the way you arched into my touch. You can try to forget it, but your body remembers. ❣"
      ],
      caption: "Your mind can try to rationalize it, but your body never lies. Overthinking at 2 AM won't change the way your heart raced when we were close.\n\nSave this for difficult nights. ❣\n\n#overthinking #modernrelationship #secretthoughts #datingstruggles #desire #intimate #chemistry #romance"
    },
    {
      backgroundTheme: 'rainy_bed',
      slides: [
        "Staring at my ceiling at 3 AM, replaying the way your hands felt under my shirt. The sudden, raw intensity of how you pulled me against you. I should be sleeping, but my mind is trapped in the memory of your warmth, wanting it all over again. ❣"
      ],
      caption: "Some memories are too warm to let you sleep. Are you overthinking someone tonight?\n\nSave this for late nights. ❣\n\n#latenightthoughts #missingyou #secretthoughts #romantictension #bedtimerelationships #chemistry"
    },
    {
      backgroundTheme: 'overthinking_night',
      slides: [
        "We play it cool during the day, but my mind is a dangerous place after midnight. I keep imagining your lips on my neck, your breath on my skin, and the sweet chaos of our bodies tangled together. It's a secret I'll never tell you, but one I live in every night. ❣"
      ],
      caption: "The thoughts we hide from the sun always find us in the dark. Who are you dreaming about tonight?\n\nSave this if you have a secret desire. ❣\n\n#hiddendesire #secrets #overthinking #midnighthoughts #romancequotes #chemistry"
    },
    {
      backgroundTheme: 'secret_thoughts',
      slides: [
        "I read your text and my mind goes straight to the gutter. Remembering the heat of your breath, the grip of your hands on my waist, and the way you whispered my name. You think it's a simple conversation, but I'm burning on the other side of the screen. ❣"
      ],
      caption: "A simple word can spark a fire when the chemistry is real. Sometimes texting is just a cover for what we really want to say.\n\nSave this if their texts make your heart race. ❣\n\n#texts #flirting #chemistry #attractioncode #moderndating #overthinking"
    }
  ],
  'Situationships & Forbidden Love': [
    {
      backgroundTheme: 'shadowy_lounge',
      slides: [
        "The danger of 'just talking.' We lock the door, and suddenly the rules don't exist. My hands find your waist, your back meets the wall, and every promise of 'just friends' is whispered away against my lips. We're playing with fire, and we both want to burn. ❥"
      ],
      caption: "Forbidden tension always tastes the sweetest. A situationship is a dangerous game, but the physical connection is addictive. Who are you playing with?\n\nShare this with someone who needs to see this. ❥\n\n#forbiddenlove #situationship #chemistry #attraction #seductive #tension #secretlovers #heartbreak"
    },
    {
      backgroundTheme: 'shadowy_lounge',
      slides: [
        "We agreed to keep it simple, but simplicity went out the window the second your lips touched mine. The secret late-night drives, the hushed whispers in the dark, and the frantic touch that knows we shouldn't, but absolutely must. We are a beautiful mistake. ❥"
      ],
      caption: "When the chemistry overrides the rules. Some connections are too intense to fit into clean labels.\n\nTag the one you shouldn't want but do. ❥\n\n#situationship #secretlovers #forbiddenchemistry #attraction #tension #lovequotes #seduction"
    },
    {
      backgroundTheme: 'sensual_vibes',
      slides: [
        "The sweet torture of loving someone you can't claim. Having you in the dark, feeling the desperate heat of your embrace, knowing that tomorrow we go back to pretending. Every kiss feels like borrowed time, which only makes us crave it more. ❥"
      ],
      caption: "Borrowed time makes the touch burn hotter. It's a heavy price to pay, but we pay it willingly every time.\n\nSave this if you understand the weight of forbidden love. ❥\n\n#forbiddenlove #longing #heartbreak #secretchemistry #seductivequotes #relationshipgoals"
    },
    {
      backgroundTheme: 'intimate_touch',
      slides: [
        "We call it 'just fun,' but the way you pull me closer in your sleep tells a different story. The way your fingers linger on my skin, and how our bodies align like we belong together. We are running from labels, but our chemistry has already caught up. ❥"
      ],
      caption: "Bodies don't know how to pretend. The quiet hours of the night reveal what we try to hide during the day.\n\nShare this with the one you're 'just friends' with. ❥\n\n#justfriends #situationships #datingproblems #attraction #chemistry #passion"
    }
  ],
  'Romantic Tension & Chemistry': [
    {
      backgroundTheme: 'candlelight_secrets',
      slides: [
        "It's the way you look at my mouth when I speak. The deliberate, slow brush of my skin against yours when we pass a glass. The absolute certainty that if we are left in this room alone for one more minute, we won't be able to keep our hands off each other. ❥"
      ],
      caption: "Chemistry isn't silent—it's deafening. It's the silent prelude to something unforgettable. Have you felt that spark recently?\n\nSave this for late nights. ❥\n\n#romantictension #attractioncode #chemistry #datingadvice #secretcrush #lovequotes #sensualvibes #datingcoach"
    },
    {
      backgroundTheme: 'candlelight_secrets',
      slides: [
        "The electricity of almost touching. The way my hand hovers inches from yours, the scent of your perfume filling the space between us, and the heavy, magnetic pull drawing us together. The anticipation is so thick, it's practically touch. ❥"
      ],
      caption: "The space between us is where the fire starts. The sweet agony of waiting makes the touch worth everything.\n\nSave this if you love the thrill of anticipation. ❥\n\n#anticipation #tension #magneticattraction #chemistry #romancequotes #flirting"
    },
    {
      backgroundTheme: 'midnight_desire',
      slides: [
        "A crowded room, but you are the only thing I see. The slow, intense lock of our eyes that lasts just a second too long. A silent agreement that we both know exactly what we want to do when we finally get out of here. ❥"
      ],
      caption: "A silent contract signed across a crowded room. You can't fake this kind of tension.\n\nTag the one who holds your gaze. ❥\n\n#eyecontact #secretchemistry #tension #magnetictension #datingrules #seductive"
    },
    {
      backgroundTheme: 'shadowy_lounge',
      slides: [
        "You think you're hiding it, but I see the way your breathing changes when I stand too close. The way your eyes drop to my lips, and how you lean into my space. The chemistry is a trap, and we're both about to fall. ❥"
      ],
      caption: "Your body language is louder than you think. You can say no, but your proximity says yes.\n\nSave this if you feel that undeniable pull. ❥\n\n#bodylanguage #attraction #chemistry #datingcoach #tension #romance"
    }
  ],
  'Intimate Heartbreak & Healing': [
    {
      backgroundTheme: 'overthinking_night',
      slides: [
        "The phantom touch. You're trying to sleep, but you still feel my hands slowly tracing the curve of your hips, drawing you tight against my chest. You miss the warmth, the heavy breathing in the dark, and the sweet torture of our touch. ✦"
      ],
      caption: "Some connections leave a permanent mark on your skin. Even as you heal, the memory of late-night intimacy remains hot. Forgive yourself for remembering.\n\nSave this if you are healing. ✦\n\n#heartbreak #longing #healingjourney #sensualmemories #missingyou #intimacy #desire #closure"
    },
    {
      backgroundTheme: 'rainy_bed',
      slides: [
        "Your side of the bed is empty, but the sheets still smell like our secrets. I miss the midnight whispers, the soft kisses on my forehead, and the absolute safety of being wrapped in your arms. Healing is hard when the phantom of your touch won't leave. ✦"
      ],
      caption: "Sheets remember what the mind tries to forget. Sometimes, the physical absence is what hurts the most.\n\nSave this if you're sleeping in an empty bed tonight. ✦\n\n#emptybed #missingyou #heartbreak #healing #relationshipquotes #longing"
    },
    {
      backgroundTheme: 'overthinking_night',
      slides: [
        "We said goodbye, but my body hasn't accepted it yet. I still reach out for your heat in the middle of the night, only to find cold space. The hardest part of letting go is teaching my skin to forget the way you held me. ✦"
      ],
      caption: "The physical memory of love lasts longer than the labels. It takes time for the body to catch up to the choice.\n\nSave this if you are letting go. ✦\n\n#lettinggo #heartbreakquotes #coldbed #healingjourney #sensualmemories"
    },
    {
      backgroundTheme: 'secret_thoughts',
      slides: [
        "I don't miss the arguments, but I miss the raw, desperate way we used to make up. The touch that washed away all the anger, the heavy breathing, and the absolute certainty that in that moment, we were one. Healing is missing the peace, but craving the fire. ✦"
      ],
      caption: "Craving the fire even when you know it burns. Letting go of the toxicity doesn't mean your skin doesn't miss the chemistry.\n\nSave this if you relate to the healing struggle. ✦\n\n#healing #confessions #heartbreak #intimacy #desire #relationshippsychology"
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

Generate a highly suggestive, high-tension single-slide post (not a multi-slide carousel) and caption for the category: "${category}".
${topicQuery ? `Base the content and theme on this trending topic/issue: "${topicQuery}".` : ''}
${examplesText}
${recentConstraintText}

CRITICAL CONTENT INSTRUCTIONS:
- Writing Style: Deep, raw, highly suggestive, and emotionally charged (18+). Use short, heavy, punchy sentences. It must feel like a quiet confession, an intimate secret shared in the dark, or a raw psychological truth about physical desire, attraction, and chemistry.
- Tone: Extremely magnetic, seductive, and provocative (within safety guidelines: strictly non-explicit and non-pornographic, but high-tension PG-13/R-rated romance). It should trigger a strong emotional and physical response (goosebumps, heart racing, intense familiarity).
- Slide text: Generate exactly 1 slide content containing a powerful emotional hook and a short, highly suggestive, high-tension storytelling paragraph. Use 3-4 short, punchy sentences in total (max 45-60 words). Include one of the mature symbols (❦, ❣, ❥, ✦) as a subtle punctuation separator.

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
    "Slide hook and story text combined here"
  ],
  "caption": "Full Instagram caption text..."
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
