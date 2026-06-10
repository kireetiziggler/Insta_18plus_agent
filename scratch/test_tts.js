import * as googleTTS from 'google-tts-api';
import fs from 'fs/promises';

async function test() {
  try {
    console.log("Testing google-tts-api...");
    const text = "This is a test of the Google Text to Speech API to see if it successfully generates a premium audio voiceover for our Instagram Reels subsystem. It should work perfectly.";
    const results = await googleTTS.getAllAudioBase64(text, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000
    });
    console.log(`Successfully generated ${results.length} chunks!`);
    const buffers = results.map(item => Buffer.from(item.base64, 'base64'));
    const combined = Buffer.concat(buffers);
    await fs.writeFile('scratch/test_tts.mp3', combined);
    console.log("Saved test_tts.mp3 to scratch/ folder");
  } catch (error) {
    console.error("Error during TTS testing:", error);
  }
}

test();
