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

async function extract() {
  const reelPath = 'c:/Users/kiree/OneDrive/Documents/Insta_agent/data/posts/reel_sassy_1780460938088/reel.mp4';
  const outPath1 = 'C:/Users/kiree/.gemini/antigravity/brain/ed54c431-ce24-48e3-9b21-0bddc7253f51/screenshot_main.png';
  const outPath2 = 'C:/Users/kiree/.gemini/antigravity/brain/ed54c431-ce24-48e3-9b21-0bddc7253f51/screenshot_cta.png';
  
  try {
    console.log('Extracting screenshot from reel.mp4 at t=5s...');
    await runCommand(`"${ffmpegPath}" -y -ss 00:00:05 -i "${reelPath}" -vframes 1 "${outPath1}"`);
    console.log('Saved screenshot 1 to:', outPath1);

    console.log('Extracting screenshot from reel.mp4 at t=18s...');
    await runCommand(`"${ffmpegPath}" -y -ss 00:00:18 -i "${reelPath}" -vframes 1 "${outPath2}"`);
    console.log('Saved screenshot 2 to:', outPath2);
  } catch (err) {
    console.error('Error extracting screenshot:', err.message);
  }
}

extract();
