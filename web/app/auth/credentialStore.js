import crypto from 'crypto';
import { Meteor } from 'meteor/meteor';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const DEFAULT_TTL_MINUTES = 30;
const CLEANUP_INTERVAL_MS = 60 * 1000;

// Encryption key: from env var (cluster-safe) or random per boot (more secure)
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY
  ? Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY, 'hex')
  : crypto.randomBytes(32);

// In-memory store: Map<userId, { encrypted, iv, tag, expiresAt }>
const store = new Map();

function getTtlMs() {
  const minutes = Meteor.settings?.samba?.sessionTtlMinutes || DEFAULT_TTL_MINUTES;
  return minutes * 60 * 1000;
}

function encrypt({ text }) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted, iv, tag };
}

function decrypt({ encrypted, iv, tag }) {
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// Stores encrypted credentials for a user session
export function storeCredentials({ userId, username, password }) {
  const payload = JSON.stringify({ username, password });
  const { encrypted, iv, tag } = encrypt({ text: payload });

  store.set(userId, {
    encrypted,
    iv,
    tag,
    expiresAt: Date.now() + getTtlMs(),
  });
}

// Retrieves decrypted credentials for a user session
// Throws if expired or not found
export function getCredentials({ userId }) {
  const entry = store.get(userId);

  if (!entry) {
    throw new Meteor.Error('session-expired', 'No active session. Please log in again.');
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(userId);
    throw new Meteor.Error('session-expired', 'Your session has expired. Please log in again.');
  }

  const payload = decrypt({
    encrypted: entry.encrypted,
    iv: entry.iv,
    tag: entry.tag,
  });

  return JSON.parse(payload);
}

// Checks if a user has valid (non-expired) credentials
export function hasValidCredentials({ userId }) {
  const entry = store.get(userId);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    store.delete(userId);
    return false;
  }

  return true;
}

// Clears credentials for a user (logout)
export function clearCredentials({ userId }) {
  store.delete(userId);
}

// Auto-cleanup expired entries
setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of store) {
    if (now > entry.expiresAt) {
      store.delete(userId);
    }
  }
}, CLEANUP_INTERVAL_MS);
