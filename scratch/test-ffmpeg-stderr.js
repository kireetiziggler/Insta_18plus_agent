import { exec } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function testFFmpeg() {
  const postDir = path.join(__dirname, '..', 'data', 'posts', 'reel_sample_run');
  const bgVideoPath = path.join(postDir, 'background.mp4');
  
  // Stitches video with Fontsize=24, Alignment=2, and MarginV=75 (scaled to 288 script height)
  const ffmpegCmd = `"${ffmpegPath}" -y -stream_loop -1 -i "${bgVideoPath}" -loop 1 -i "slide.png" -i "audio.mp3" -filter_complex "[0:v]scale=-1:1920,crop=1080:1920[bg]; [bg][1:v]overlay=0:0[merged]; [merged]subtitles=subtitles.srt:force_style='Fontname=Arial,Fontsize=24,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,MarginV=75,Alignment=2'[outv]" -map "[outv]" -map 2:a -c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -crf 17 "reel_test_styled.mp4"`;
  
  console.log('Running FFmpeg command in cwd:', postDir);
  try {
    await runCommand(ffmpegCmd, { cwd: postDir });
    console.log('✓ Successfully compiled reel_test_styled.mp4');
    
    // Extract screenshot at t=0.5s where first subtitle is active
    console.log('Extracting screenshot at t=0.5s...');
    const screenshot = path.join(postDir, 'screenshot_test_styled.png');
    await runCommand(`"${ffmpegPath}" -y -ss 00:00:00.500 -i "${path.join(postDir, 'reel_test_styled.mp4')}" -vframes 1 "${screenshot}"`);
    console.log('✓ Saved screenshot to:', screenshot);
  } catch (err) {
    console.error('Error running compile or extract:', err.message);
  }
}

testFFmpeg();
