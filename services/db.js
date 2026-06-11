import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

const DEFAULT_DB = {
  settings: {
    geminiApiKey: '',
    instagramBusinessId: '',
    facebookPageToken: '',
    isSimulationMode: false,
    pageHandle: '@unspoken.desires.co',
    elevenLabsApiKey: '',
    elevenLabsVoiceId: 'alternate',
    postingSchedule: {
      post1: '09:00',
      post2: '14:00',
      post3: '21:00',
      post4: '22:00',
      post5: '00:00',
      reel1: '17:00'
    }
  },
  posts: [],
  trends: [],
  logs: []
};

// Ensure directories exist
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

class Database {
  constructor() {
    this.data = null;
    this.loadingPromise = null;
  }

  async load() {
    if (this.data) return this.data;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      await ensureDir(path.dirname(DB_FILE));
      await ensureDir(path.join(__dirname, '..', 'data', 'posts'));
      try {
        const fileContent = await fs.readFile(DB_FILE, 'utf8');
        this.data = JSON.parse(fileContent);
        // Ensure default structure parts exist in case of partial schema updates
        this.data.settings = { ...DEFAULT_DB.settings, ...this.data.settings };
        this.data.settings.postingSchedule = { ...DEFAULT_DB.settings.postingSchedule, ...this.data.settings.postingSchedule };
        this.data.posts = this.data.posts || [];
        this.data.trends = this.data.trends || [];
        this.data.logs = this.data.logs || [];
      } catch (err) {
        if (err.code === 'ENOENT') {
          this.data = JSON.parse(JSON.stringify(DEFAULT_DB));
          await this.save();
        } else {
          console.error('Failed to read db.json:', err);
          throw err;
        }
      }
      return this.data;
    })();

    const result = await this.loadingPromise;
    this.loadingPromise = null;
    return result;
  }

  async save() {
    if (!this.data) return;
    await ensureDir(path.dirname(DB_FILE));
    await fs.writeFile(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
  }

  async getSettings() {
    const db = await this.load();
    return db.settings;
  }

  async updateSettings(newSettings) {
    const db = await this.load();
    db.settings = { ...db.settings, ...newSettings };
    await this.save();
    await this.log('SYSTEM', 'Settings updated');
    return db.settings;
  }

  async getPosts() {
    const db = await this.load();
    return db.posts;
  }

  async getPost(id) {
    const db = await this.load();
    return db.posts.find(p => p.id === id) || null;
  }

  async savePost(post) {
    const db = await this.load();
    const index = db.posts.findIndex(p => p.id === post.id);
    if (index >= 0) {
      db.posts[index] = { ...db.posts[index], ...post };
    } else {
      db.posts.push(post);
    }
    await this.save();
    return post;
  }

  async deletePost(id) {
    const db = await this.load();
    db.posts = db.posts.filter(p => p.id !== id);
    await this.save();
    // Try to delete directory
    try {
      const postDir = path.join(__dirname, '..', 'data', 'posts', id);
      await fs.rm(postDir, { recursive: true, force: true });
    } catch (e) {
      // ignore deletion errors
    }
    return true;
  }

  async getTrends() {
    const db = await this.load();
    return db.trends;
  }

  async saveTrends(trends) {
    const db = await this.load();
    db.trends = trends;
    await this.save();
  }

  async getLogs() {
    const db = await this.load();
    return db.logs;
  }

  async log(type, message) {
    const db = await this.load();
    const logEntry = {
      timestamp: new Date().toISOString(),
      type, // 'SYSTEM' | 'RESEARCH' | 'GENERATOR' | 'PUBLISHER' | 'ERROR'
      message
    };
    db.logs.unshift(logEntry); // Add to beginning
    if (db.logs.length > 500) {
      db.logs = db.logs.slice(0, 500); // Limit logs size
    }
    await this.save();
    console.log(`[${logEntry.timestamp}] [${type}] ${message}`);
  }

  async clearLogs() {
    const db = await this.load();
    db.logs = [];
    await this.save();
  }
}

export const db = new Database();
export default db;
