import crypto from 'crypto';
import { Meteor } from 'meteor/meteor';
import { SettingsCollection } from '../settings/SettingsCollection';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_DIGEST = 'sha512';
const KEY_LENGTH = 32;
const DR_CONFIG_KEY = 'dr.config';

// In-memory DR Key — null when locked
let drKey = null;

// Derives a 256-bit key from a passphrase/key using PBKDF2
function deriveKey({ key, salt }) {
  return crypto.pbkdf2Sync(key, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
}

// Creates a verification hash to validate the key without storing it
function createVerificationHash({ key, salt }) {
  return crypto.createHmac('sha256', salt).update(key).digest('base64');
}

// Generates a random key as hex string (64 chars = 32 bytes)
export function generateDrKeyString() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

// Configures the DR Key for the first time
// Saves salt + verification hash to MongoDB, stores derived key in memory
export async function configureDrKey({ key }) {
  if (!key || key.length < 16) {
    throw new Meteor.Error('dr.key.invalid', 'DR key must be at least 16 characters');
  }

  const existing = await SettingsCollection.findOneAsync({ key: DR_CONFIG_KEY });
  if (existing?.value?.salt) {
    throw new Meteor.Error('dr.key.exists', 'DR key is already configured. Use changeDrKey to update.');
  }

  const salt = crypto.randomBytes(32);
  const verificationHash = createVerificationHash({ key, salt });
  const derivedKey = deriveKey({ key, salt });

  await SettingsCollection.upsertAsync(
    { key: DR_CONFIG_KEY },
    {
      $set: {
        key: DR_CONFIG_KEY,
        value: {
          salt: salt.toString('base64'),
          verificationHash,
          configuredAt: new Date(),
        },
      },
    }
  );

  drKey = derivedKey;
}

// Unlocks the DR Key (after server restart) by validating against stored hash
export async function unlockDrKey({ key }) {
  const config = await SettingsCollection.findOneAsync({ key: DR_CONFIG_KEY });

  if (!config?.value?.salt) {
    throw new Meteor.Error('dr.key.not-configured', 'DR key has not been configured');
  }

  const salt = Buffer.from(config.value.salt, 'base64');
  const expectedHash = config.value.verificationHash;
  const actualHash = createVerificationHash({ key, salt });

  if (actualHash !== expectedHash) {
    throw new Meteor.Error('dr.key.invalid', 'Invalid DR key');
  }

  drKey = deriveKey({ key, salt });
}

// Changes the DR Key — requires current key for validation
// Re-encrypts all existing DR data is NOT handled here (caller must handle)
export async function changeDrKey({ currentKey, newKey }) {
  // Validate current key first
  await unlockDrKey({ key: currentKey });

  // Remove old config
  await SettingsCollection.removeAsync({ key: DR_CONFIG_KEY });

  // Reset in-memory key
  drKey = null;

  // Configure with new key
  await configureDrKey({ key: newKey });
}

// Returns the derived DR Key buffer — throws if locked
export function getDrKey() {
  if (!drKey) {
    throw new Meteor.Error('dr.key.locked', 'DR key is not unlocked. Please unlock it in the admin panel.');
  }
  return drKey;
}

// Checks if DR Key is configured in MongoDB
export async function isDrKeyConfigured() {
  const config = await SettingsCollection.findOneAsync({ key: DR_CONFIG_KEY });
  return !!(config?.value?.salt);
}

// Checks if DR Key is currently loaded in memory
export function isDrKeyUnlocked() {
  return drKey !== null;
}

// Encrypts text using the DR Key (AES-256-GCM)
export function drEncrypt({ text }) {
  const key = getDrKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

// Decrypts data using the DR Key (AES-256-GCM)
export function drDecrypt({ encrypted, iv, tag }) {
  const key = getDrKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

// Try to auto-unlock from env var on startup
export function tryAutoUnlock() {
  const envKey = process.env.DR_KEY;
  if (envKey) {
    // Defer to after Meteor startup so collections are ready
    Meteor.startup(async () => {
      try {
        const configured = await isDrKeyConfigured();
        if (configured) {
          await unlockDrKey({ key: envKey });
          console.log('[DR] Auto-unlocked via DR_KEY env var');
        }
      } catch (error) {
        console.error('[DR] Auto-unlock failed:', error.message);
      }
    });
  }
}

// Auto-unlock on module load
tryAutoUnlock();
