import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../services/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('====================================================');
  console.log('AURAGLOW - SYNCING DATABASE POSTS WITH DISK FOLDERS');
  console.log('====================================================\n');

  try {
    const postsDir = path.join(__dirname, '..', 'data', 'posts');
    const existingFolders = await fs.readdir(postsDir);
    console.log(`Found ${existingFolders.length} folders on disk:`, existingFolders);

    const database = await db.load();
    const originalCount = database.posts.length;

    // Filter database posts to keep only those whose folders exist
    database.posts = database.posts.filter(post => {
      return existingFolders.includes(post.id);
    });

    console.log(`Database filtered: kept ${database.posts.length} of ${originalCount} posts.`);
    
    await db.save();
    console.log('✓ Database db.json saved successfully.');

    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to sync database with folders:', error);
    process.exit(1);
  }
}

run();
