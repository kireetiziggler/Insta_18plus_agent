import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import db from './db.js';
import generator from './generator.js';
import renderer from './renderer.js';
import googleTTS from 'google-tts-api';
import ffmpegPath from 'ffmpeg-static';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THEME_VIDEOS = {
  midnight_desire: 'https://vjs.zencdn.net/v/oceans.mp4',
  rainy_bed: 'https://vjs.zencdn.net/v/oceans.mp4',
  shadowy_lounge: 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
  candlelight_secrets: 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
  intimate_touch: 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
  overthinking_night: 'https://vjs.zencdn.net/v/oceans.mp4',
  secret_thoughts: 'https://vjs.zencdn.net/v/oceans.mp4',
  sensual_vibes: 'https://vjs.zencdn.net/v/oceans.mp4'
};

const PEXELS_THEME_QUERIES = {
  midnight_desire: 'couples intimate candle light shadow silhouette dark low light',
  rainy_bed: 'cozy dark bedroom night rain street lights window bedroom',
  shadowy_lounge: 'shadowy bar night couple romantic tension low light',
  candlelight_secrets: 'hands touch candle light night table aesthetic dark romantic',
  intimate_touch: 'gentle touch embrace shadow couple intimacy body low light night',
  overthinking_night: 'person look window night city neon lights lonely shadow',
  secret_thoughts: 'person sit silk bed phone screen night bedroom dark glow',
  sensual_vibes: 'crimson gold luxury silk abstract dark light texture red'
};

async function downloadBackgroundVideo(themeName, postDir) {
  const targetPath = path.join(postDir, 'background.mp4');
  
  try {
    await fs.access(targetPath);
    await db.log('SYSTEM', `Using existing background video for this Reel: ${targetPath}`);
    return targetPath;
  } catch (e) {
    // Proceed to search & download
  }

  // 1. Lookup the post's day of the week to align styling and background themes
  let dayOfWeek = new Date().getDay();
  try {
    const postId = path.basename(postDir);
    const post = await db.getPost(postId);
    if (post && post.scheduledFor) {
      dayOfWeek = new Date(post.scheduledFor).getDay();
    }
  } catch (err) {
    // Fall back to current time
  }

  // Map each day of the week to a unique, stunning visual background theme query
  const queryOverrides = {
    0: 'couples intimate candle light shadow silhouette dark low light',
    1: 'shadowy bar night couple romantic tension low light',
    2: 'cozy dark bedroom night rain street lights window bedroom',
    3: 'gentle touch embrace shadow couple intimacy body low light night',
    4: 'person look window night city neon lights lonely shadow',
    5: 'person sit silk bed phone screen night bedroom dark glow',
    6: 'crimson gold luxury silk abstract dark light texture red'
  };

  let query = queryOverrides[dayOfWeek] || PEXELS_THEME_QUERIES[themeName] || themeName || 'romantic chemistry';
  // Force dark-themed filter for text readability where appropriate
  if (!query.toLowerCase().includes('dark') && !query.toLowerCase().includes('night') && 
      !query.toLowerCase().includes('romantic') && !query.toLowerCase().includes('intimate') && 
      !query.toLowerCase().includes('shadow')) {
    query = `${query} dark`;
  }
  await db.log('SYSTEM', `Searching Pexels for a unique background video matching query: "${query}"...`);
  
  let downloadUrl = null;
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
    
    const searchUrl = `https://www.pexels.com/search/videos/${encodeURIComponent(query)}/?orientation=portrait`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('video source, video', { timeout: 8000 });
    
    const videoUrls = await page.evaluate(() => {
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
    
    if (videoUrls.length > 0) {
      // Pick a random video from the top 10 results to ensure uniqueness
      const randomIndex = Math.floor(Math.random() * Math.min(videoUrls.length, 10));
      downloadUrl = videoUrls[randomIndex];
      await db.log('SYSTEM', `Found ${videoUrls.length} Pexels videos. Selected random index ${randomIndex}: ${downloadUrl}`);
    }
  } catch (err) {
    await db.log('ERROR', `Pexels video scraper encountered an error: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // 2. Download the chosen video, or fall back to the curated CDN if scraping failed
  const finalDownloadUrl = downloadUrl || THEME_VIDEOS[themeName] || THEME_VIDEOS.personal_growth;
  await db.log('SYSTEM', `Downloading Reel background video from URL: ${finalDownloadUrl}`);
  
  try {
    const response = await fetch(finalDownloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(targetPath, buffer);
    await db.log('SYSTEM', `Successfully downloaded background video to ${targetPath}`);
    return targetPath;
  } catch (err) {
    await db.log('ERROR', `Failed to download background video: ${err.message}. Generating solid fallback.`);
    const fallbackPath = path.join(postDir, 'background.mp4');
    try {
      const genCmd = `"${ffmpegPath}" -y -f lavfi -i color=c=0x08080a:size=1080x1920:rate=25 -t 30 "${fallbackPath}"`;
      await runCommand(genCmd);
      return fallbackPath;
    } catch (genErr) {
      await db.log('ERROR', `Fallback video generation failed: ${genErr.message}`);
      throw genErr;
    }
  }
}

// Helper to run shell commands as promises
function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Curated sensual, smooth, and romantic copyright-free music tracks (mostly lofi and romantic ambient)
const MUSIC_TRACKS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // romantic testing track
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
];

// Download a random background music track for the Reel
async function downloadBackgroundMusic(postDir) {
  const musicPath = path.join(postDir, 'music.mp3');
  // Pick a random track from our curated list
  const track = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)];
  await db.log('SYSTEM', `Downloading background music track: ${track}`);
  try {
    const response = await fetch(track, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(musicPath, buffer);
    await db.log('SYSTEM', `Background music downloaded successfully to ${musicPath}`);
    return musicPath;
  } catch (err) {
    await db.log('ERROR', `Failed to download background music: ${err.message}. Generating silent fallback.`);
    // Generate 20 seconds of silence as fallback
    const silentCmd = `"${ffmpegPath}" -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 20 "${musicPath}"`;
    await runCommand(silentCmd, { cwd: postDir });
    return musicPath;
  }
}

// Synthesizes voiceover text to MP3
async function synthesizeVoiceover(postId, text, settings, filename = 'audio.mp3') {
  const postDir = path.join(__dirname, '..', 'data', 'posts', postId);
  const audioPath = path.join(postDir, filename);

  const apiKey = settings.elevenLabsApiKey;
  let voiceId = settings.elevenLabsVoiceId || 'alternate';

  if (voiceId === 'alternate') {
    const day = new Date().getDate();
    // Alternates daily: Even days -> Sarah (Female, Confident), Odd days -> Adam (Male, Firm)
    voiceId = (day % 2 === 0) ? 'EXAVITQu4vr4xnSDxMaL' : 'pNInz6obpgDQGcFmaJgB';
    await db.log('SYSTEM', `Daily Voice Shift active. Selected voice: ${voiceId === 'EXAVITQu4vr4xnSDxMaL' ? 'Sarah (Female)' : 'Adam (Male)'}`);
  }

  if (apiKey) {
    try {
      await db.log('SYSTEM', `Synthesizing Reel voiceover using ElevenLabs (Voice ID: ${voiceId}) with timestamps into ${filename}...`);
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.35,
            similarity_boost: 0.85,
            style: 0.55,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const buffer = Buffer.from(result.audio_base64, 'base64');
      await fs.writeFile(audioPath, buffer);
      await db.log('SYSTEM', `Successfully saved ElevenLabs TTS audio with timestamps to ${audioPath}`);
      return { 
        path: `/posts/${postId}/${filename}`, 
        engine: 'elevenlabs',
        alignment: result.alignment 
      };
    } catch (err) {
      await db.log('ERROR', `ElevenLabs voiceover synthesis failed: ${err.message}. Falling back to Google TTS API.`);
    }
  }

  // Fallback to Google TTS
  await db.log('SYSTEM', `Synthesizing Reel voiceover using Google TTS API (free) into ${filename}...`);
  try {
    const results = await googleTTS.getAllAudioBase64(text, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000
    });

    const buffers = results.map(item => Buffer.from(item.base64, 'base64'));
    const combined = Buffer.concat(buffers);
    await fs.writeFile(audioPath, combined);
    await db.log('SYSTEM', `Successfully saved Google TTS audio to ${audioPath}`);
    return { path: `/posts/${postId}/${filename}`, engine: 'google' };
  } catch (err) {
    await db.log('ERROR', `Google TTS voiceover synthesis failed: ${err.message}`);
    throw err;
  }
}

// Helper to extract duration of audio file using FFmpeg
async function getAudioDuration(audioPath) {
  try {
    const cmd = `"${ffmpegPath}" -i "${audioPath}"`;
    let stderr = '';
    try {
      const result = await runCommand(cmd);
      stderr = result.stderr || result.stdout || '';
    } catch (err) {
      stderr = err.stderr || err.message || '';
    }
    const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      const hundredths = parseInt(match[4], 10);
      return hours * 3600 + minutes * 60 + seconds + hundredths / 100;
    }
    return 30.0; // fallback duration
  } catch (err) {
    return 30.0;
  }
}

// Split text into short subtitle phrases (1-3 words each, uppercase, breaking on punctuation)
function splitIntoPhrases(text) {
  if (!text) return [];
  // Capitalize and clean up spacing
  const cleanText = text.replace(/\s+/g, ' ').trim().toUpperCase();
  const words = cleanText.split(' ');
  const phrases = [];
  let currentPhrase = [];

  for (const word of words) {
    currentPhrase.push(word);
    const lastChar = word.slice(-1);
    const hasSentenceEnd = ['.', '!', '?', ','].includes(lastChar);
    const isMaxLength = currentPhrase.length >= 2;
    if (isMaxLength || hasSentenceEnd) {
      phrases.push(currentPhrase.join(' '));
      currentPhrase = [];
    }
  }
  if (currentPhrase.length > 0) {
    phrases.push(currentPhrase.join(' '));
  }
  return phrases.filter(p => p.trim().length > 0);
}

// Groups character alignments into words
function parseWordsFromAlignment(alignment) {
  if (!alignment || !alignment.characters || !alignment.character_start_times_seconds || !alignment.character_end_times_seconds) {
    return [];
  }

  const characters = alignment.characters;
  const startTimes = alignment.character_start_times_seconds;
  const endTimes = alignment.character_end_times_seconds;

  const words = [];
  let currentWordChars = [];
  let currentStart = null;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const start = startTimes[i];
    const end = endTimes[i];

    if (/\s/.test(char)) {
      if (currentWordChars.length > 0) {
        words.push({
          text: currentWordChars.join(''),
          startTime: currentStart,
          endTime: endTimes[i - 1]
        });
        currentWordChars = [];
        currentStart = null;
      }
    } else {
      if (currentWordChars.length === 0) {
        currentStart = start;
      }
      currentWordChars.push(char);
    }
  }

  if (currentWordChars.length > 0) {
    words.push({
      text: currentWordChars.join(''),
      startTime: currentStart,
      endTime: endTimes[endTimes.length - 1]
    });
  }

  return words;
}

// Groups words into phrases (max 2 words or split on punctuation)
function groupWordsIntoPhrases(words) {
  const phrases = [];
  let currentPhraseWords = [];

  for (let i = 0; i < words.length; i++) {
    const wordObj = words[i];
    currentPhraseWords.push(wordObj);

    const hasPunctuation = /[.,!?;]/.test(wordObj.text);
    const isMaxLength = currentPhraseWords.length >= 2;

    if (isMaxLength || hasPunctuation) {
      phrases.push({
        text: currentPhraseWords.map(w => w.text).join(' '),
        startTime: currentPhraseWords[0].startTime,
        endTime: currentPhraseWords[currentPhraseWords.length - 1].endTime
      });
      currentPhraseWords = [];
    }
  }

  if (currentPhraseWords.length > 0) {
    phrases.push({
      text: currentPhraseWords.map(w => w.text).join(' '),
      startTime: currentPhraseWords[0].startTime,
      endTime: currentPhraseWords[currentPhraseWords.length - 1].endTime
    });
  }

  return phrases;
}

// Proportional fallback phrase timing generator when alignment is missing
function generateProportionalPhrases(phrasesText, duration, offset = 0.0) {
  const phraseWeights = phrasesText.map(phrase => {
    const words = phrase.split(' ');
    let weight = words.length;
    const lastChar = phrase.trim().slice(-1);
    if (['.', '!', '?'].includes(lastChar)) {
      weight += 2.0;
    } else if ([',', ';', ':'].includes(lastChar)) {
      weight += 1.0;
    }
    return weight;
  });

  const totalWeight = phraseWeights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return [];

  const result = [];
  let currentTime = 0;

  for (let i = 0; i < phrasesText.length; i++) {
    const phrase = phrasesText[i];
    const weight = phraseWeights[i];
    const rawDuration = duration * (weight / totalWeight);

    const lastChar = phrase.trim().slice(-1);
    let displayDuration = rawDuration;
    let pauseDuration = 0;

    if (['.', '!', '?'].includes(lastChar)) {
      pauseDuration = Math.min(0.6, rawDuration * 0.3);
      displayDuration = rawDuration - pauseDuration;
    } else if ([',', ';', ':'].includes(lastChar)) {
      pauseDuration = Math.min(0.3, rawDuration * 0.15);
      displayDuration = rawDuration - pauseDuration;
    }

    let startTime = currentTime + offset;
    let endTime = currentTime + displayDuration + offset;

    const maxDuration = duration + offset;
    if (startTime < 0) startTime = 0;
    if (endTime < 0) endTime = 0;
    if (startTime > maxDuration) startTime = maxDuration;
    if (endTime > maxDuration) endTime = maxDuration;

    result.push({
      text: phrase,
      startTime,
      endTime
    });

    currentTime += rawDuration;
  }

  return result;
}

// Formats seconds into H:MM:SS.cs (centiseconds) format for ASS subtitles
function formatASSTime(seconds) {
  if (seconds < 0) seconds = 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);

  const pad = (num, size) => ('00' + num).slice(-size);
  return `${hrs}:${pad(mins, 2)}:${pad(secs, 2)}.${pad(cs, 2)}`;
}

// Generates the ASS subtitle file content
function generateASS(phrases, offset = 0.0) {
  let assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,78,&H00FFFFFF,&H000000FF,&H00000000,&H25000000,1,0,0,0,100,100,0,0,3,12,0,5,100,100,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const startTime = phrase.startTime + offset;
    const endTime = phrase.endTime + offset;

    const startStr = formatASSTime(startTime);
    const endStr = formatASSTime(endTime);

    // Clean up quotes and force uppercase
    const cleanText = phrase.text.replace(/['"“”]/g, '').trim().toUpperCase();

    assContent += `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${cleanText}\n`;
  }

  return assContent;
}

// Helper to compile/recompile all video assets for a Reel post (music-only, no voiceover)
export async function compileReel(postId, titleText, backgroundTheme, category, audioScript) {
  const postDir = path.join(__dirname, '..', 'data', 'posts', postId);
  await fs.mkdir(postDir, { recursive: true });

  // TARGET: Exactly 15 seconds total reel duration
  const REEL_TOTAL_DURATION = 15.0;

  // 1. Render slides
  await db.log('SYSTEM', `Rendering Reels for post "${postId}"...`);
  const slideContent = audioScript && audioScript.trim().length > 0 ? audioScript.trim() : titleText;
  const slidePath = await renderer.renderReelSlide(postId, slideContent, backgroundTheme, category);

  await db.log('SYSTEM', `Downloading sensual background music for post "${postId}"...`);
  const musicPath = await downloadBackgroundMusic(postDir);

  const videoFullPath = path.join(postDir, 'reel.mp4');

  try {
    await db.log('SYSTEM', `Reel timeline: Slide=${REEL_TOTAL_DURATION}s | Total=${REEL_TOTAL_DURATION}s`);

    // Trim music to exactly 15s with 0.5s fade-in and 1.5s fade-out — music ONLY, no voiceover
    await db.log('SYSTEM', `Preparing music audio: trimming to 15s with fade-in/fade-out...`);
    const audioCmd = `"${ffmpegPath}" -y -i "music.mp3" -filter_complex "[0:a]afade=t=in:st=0:d=0.5,afade=t=out:st=13.5:d=1.5,atrim=0:${REEL_TOTAL_DURATION}[outa]" -map "[outa]" -c:a libmp3lame -b:a 192k "audio.mp3"`;
    await runCommand(audioCmd, { cwd: postDir });

    // Determine whether we have a separate 9:16 background jpg from Pollinations
    // (slide.png is the complete rendered frame with background+text+watermark baked in)
    await db.log('SYSTEM', `Running FFmpeg to compose final 15-second Reel (music-only)...`);

    // Video layout:
    //   0s – 15s  → slide.png (full cinematic frame with text + watermark)
    // Audio: music.mp3 at full volume for all 15s (fade in/out already applied)
    const ffmpegCmd = `"${ffmpegPath}" -y -loop 1 -i "slide.png" -i "audio.mp3" `
      + `-filter_complex `
      + `"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1[slide]" `
      + `-map "[slide]" -map 1:a `
      + `-c:v libx264 -profile:v high -level:v 4.1 -pix_fmt yuv420p -movflags +faststart `
      + `-c:a aac -b:a 192k `
      + `-t ${REEL_TOTAL_DURATION} -crf 17 `
      + `"reel.mp4"`;

    await runCommand(ffmpegCmd, { cwd: postDir });
    await db.log('SYSTEM', `FFmpeg compositing completed. 15s music-only Reel: ${videoFullPath}`);
  } catch (err) {
    await db.log('ERROR', `FFmpeg execution failed: ${err.message}`);
    throw new Error(`FFmpeg stitching failed: ${err.message}`);
  }

  return {
    renderedImages: [slidePath],
    renderedVideo: `/posts/${postId}/reel.mp4`,
    renderedAudio: `/posts/${postId}/audio.mp3`
  };
}



// Full Reel generation workflow
export async function generateReel(postId, category, topicQuery = null) {
  // 1. Generate Content
  const content = await generator.generateReelContent(category, topicQuery);

  // 2. Save Draft Post metadata to db
  const newPost = {
    id: postId,
    type: 'reel',
    category,
    backgroundTheme: content.backgroundTheme,
    titleText: content.titleText,
    audioScript: content.audioScript,
    caption: content.caption,
    scheduledFor: new Date().toISOString(),
    status: 'draft',
    createdAt: new Date().toISOString()
  };
  await db.savePost(newPost);

  // 3. Compile all assets (slide with visible bg, TTS audio, background music, FFmpeg video)
  const assets = await compileReel(
    postId,
    content.titleText,
    content.backgroundTheme,
    category,
    content.audioScript
  );

  // 4. Update database record with assets and mark scheduled
  const updatedPost = {
    ...newPost,
    ...assets,
    status: 'scheduled'
  };
  await db.savePost(updatedPost);

  await db.log('SYSTEM', `Reel workflow completed successfully for post "${postId}"`);
  return updatedPost;
}

export default {
  generateReel,
  compileReel
};
