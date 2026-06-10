import db from '../services/db.js';

async function listVoices() {
  const settings = await db.getSettings();
  const apiKey = settings.elevenLabsApiKey;
  if (!apiKey) {
    console.error("No ElevenLabs API key configured in database.");
    return;
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    console.log(`Found ${data.voices.length} voices:`);
    for (const voice of data.voices) {
      console.log(`- ID: ${voice.voice_id} | Name: ${voice.name} | Gender: ${voice.labels.gender} | Description: ${voice.description}`);
    }
  } catch (err) {
    console.error("Failed to list voices:", err.message);
  }
}

listVoices();
