const path = require('path');
const BASE_URL = process.env.BASE_URL || 'http://localhost:4080';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || path.resolve(__dirname, '..', 'docs', 'screenshots');

module.exports = {
  BASE_URL,
  SCREENSHOT_DIR,
  CREDENTIALS: {
    admin: {
      username: 'Administrator',
      password: 'P@ssw0rd123!',
    },
  },
  VIEWPORT: { width: 1280, height: 800 },
};
