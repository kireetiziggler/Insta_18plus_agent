import fs from 'fs/promises';

async function test() {
  const url = 'https://image.pollinations.ai/prompt/a%20beautiful%20dark%20romantic%20bedroom%20at%20night%20with%20moonlight%20shining%20through%20window?width=1080&height=1080&nologo=true&seed=42';
  console.log('Fetching from URL:', url);
  try {
    const res = await fetch(url);
    console.log('Response status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      await fs.writeFile('scratch/test_pollination.png', Buffer.from(buffer));
      console.log('Saved test image to scratch/test_pollination.png');
    } else {
      const txt = await res.text();
      console.log('Error body:', txt);
    }
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

test();
