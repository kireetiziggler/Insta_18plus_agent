import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../services/db.js';

async function listModels() {
  const settings = await db.getSettings();
  const apiKey = settings.geminiApiKey;

  if (!apiKey) {
    console.error('No Gemini API key found in settings!');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  console.log('Listing available Gemini models...');
  try {
    // In @google/generative-ai, we can list models or try a simple flash call
    // Let's test generating with gemini-2.5-flash and gemini-2.0-flash
    const testModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const modelName of testModels) {
      try {
        console.log(`Testing model: "${modelName}"...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hi, reply with one word.');
        console.log(`✓ Model "${modelName}" is AVAILABLE! Response:`, result.response.text().trim());
        return; // Found a working one
      } catch (err) {
        console.log(`✗ Model "${modelName}" failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

listModels();
