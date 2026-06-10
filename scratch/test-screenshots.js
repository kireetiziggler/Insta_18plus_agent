import { exec } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

async function extractScreenshots() {
  const postDir = path.join(__dirname, '..', 'data', 'posts', 'reel_sample_run');
  const screenshot1 = path.join(postDir, 'screenshot_with_quotes.png');
  const screenshot2 = path.join(postDir, 'screenshot_no_quotes.png');
  
  try {
    console.log('Extracting screenshot from reel.mp4 (quotes compilation) at t=5s...');
    await runCommand(`"${ffmpegPath}" -y -ss 00:00:05 -i "${path.join(postDir, 'reel.mp4')}" -vframes 1 "${screenshot1}"`);
    console.log('Saved screenshot 1 to:', screenshot1);
    
    console.log('Extracting screenshot from reel_test.mp4 (no quotes compilation) at t=5s...');
    await runCommand(`"${ffmpegPath}" -y -ss 00:00:05 -i "${path.join(postDir, 'reel_test.mp4')}" -vframes 1 "${screenshot2}"`);
    console.log('Saved screenshot 2 to:', screenshot2);
  } catch (err) {
    console.error('Error extracting screenshots:', err.message);
  }
}

extractScreenshots();
