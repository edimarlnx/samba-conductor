import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Meteor } from 'meteor/meteor';
import { SettingsCollection } from '../settings/SettingsCollection';
import { SETTINGS_DEFAULTS } from '../settings/settingsDefaults';
import { drDecrypt } from '../auth/drKeyStore';
import { getSambaConfig } from '../samba/sambaConfig';

const execFileAsync = promisify(execFile);
const BACKUP_TMP_DIR = '/tmp/samba-conductor-backup';

// Gets S3 config from MongoDB, decrypting the secret key with DR Key
async function getS3Config() {
  const setting = await SettingsCollection.findOneAsync({ key: 'backup.s3' });
  const config = setting?.value || SETTINGS_DEFAULTS['backup.s3'];

  if (!config.configured) {
    throw new Meteor.Error('backup.not-configured', 'S3 backup is not configured');
  }

  let secretAccessKey = '';
  if (config.encryptedSecretKey) {
    secretAccessKey = drDecrypt(config.encryptedSecretKey);
  }

  return {
    endpoint: config.endpoint,
    bucket: config.bucket,
    region: config.region || 'us-east-1',
    accessKeyId: config.accessKeyId,
    secretAccessKey,
    prefix: config.prefix || 'samba-conductor/',
    includeMongoDump: config.includeMongoDump !== false,
    includeSambaBackup: config.includeSambaBackup !== false,
    retentionDays: config.retentionDays || 30,
  };
}

// Creates S3 client from config
function createS3Client({ endpoint, region, accessKeyId, secretAccessKey }) {
  const clientConfig = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };

  // Custom endpoint for S3-compatible storage (MinIO, Wasabi, etc.)
  if (endpoint) {
    clientConfig.endpoint = endpoint;
    clientConfig.forcePathStyle = true;
  }

  return new S3Client(clientConfig);
}

// Uploads a file to S3
async function uploadToS3({ s3Client, bucket, key, filePath }) {
  const fileStream = fs.createReadStream(filePath);
  const stat = fs.statSync(filePath);

  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileStream,
    ContentLength: stat.size,
  }));

  return { key, size: stat.size };
}

// Runs mongodump and returns the path to the archive
async function runMongoDump() {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/samba-conductor';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(BACKUP_TMP_DIR, `mongodump-${timestamp}.archive`);

  fs.mkdirSync(BACKUP_TMP_DIR, { recursive: true });

  await execFileAsync('mongodump', [
    `--uri=${mongoUrl}`,
    `--archive=${outputPath}`,
    '--gzip',
  ], { timeout: 300000 });

  return outputPath;
}

// Runs samba-tool domain backup and returns the path
async function runSambaBackup() {
  const { dockerContainer } = getSambaConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(BACKUP_TMP_DIR, `samba-${timestamp}`);

  fs.mkdirSync(backupDir, { recursive: true });

  if (dockerContainer) {
    // Run backup inside the container, then copy out
    const containerBackupDir = '/tmp/samba-backup';
    await execFileAsync('docker', [
      'exec', dockerContainer,
      'samba-tool', 'domain', 'backup', 'online',
      `--targetdir=${containerBackupDir}`,
    ], { timeout: 600000 });

    // Copy backup files from container
    await execFileAsync('docker', [
      'cp', `${dockerContainer}:${containerBackupDir}/.`, backupDir,
    ], { timeout: 120000 });

    // Cleanup inside container
    await execFileAsync('docker', [
      'exec', dockerContainer, 'rm', '-rf', containerBackupDir,
    ]).catch(() => {});
  } else {
    // Run locally
    await execFileAsync('samba-tool', [
      'domain', 'backup', 'online',
      `--targetdir=${backupDir}`,
    ], { timeout: 600000 });
  }

  // Find the backup tar file
  const files = fs.readdirSync(backupDir);
  const tarFile = files.find((f) => f.endsWith('.tar.bz2') || f.endsWith('.tar.gz') || f.endsWith('.tar'));

  if (!tarFile) {
    throw new Meteor.Error('backup.failed', 'Samba backup did not produce an archive file');
  }

  return path.join(backupDir, tarFile);
}

// Cleans up old backups beyond retention period
async function cleanupOldBackups({ s3Client, bucket, prefix, retentionDays }) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  try {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    }));

    const oldObjects = (response.Contents || []).filter(
      (obj) => obj.LastModified < cutoff
    );

    for (const obj of oldObjects) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: obj.Key,
      }));
    }

    return { deleted: oldObjects.length };
  } catch (error) {
    console.error('[Backup] Cleanup failed:', error.message);
    return { deleted: 0, error: error.message };
  }
}

// Cleans up temporary backup files
function cleanupTmpFiles() {
  try {
    fs.rmSync(BACKUP_TMP_DIR, { recursive: true, force: true });
  } catch (error) {
    console.warn('[Backup] Tmp cleanup failed:', error.message);
  }
}

// Runs a full backup: mongodump + samba backup → upload to S3
export async function runBackup({ includeMongo, includeSamba }) {
  const config = await getS3Config();
  const s3Client = createS3Client(config);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const results = { timestamp, uploads: [], errors: [] };

  try {
    // MongoDB dump
    if (includeMongo && config.includeMongoDump) {
      try {
        console.log('[Backup] Starting MongoDB dump...');
        const mongoDumpPath = await runMongoDump();
        const s3Key = `${config.prefix}${timestamp}/mongodb.archive.gz`;
        const uploaded = await uploadToS3({ s3Client, bucket: config.bucket, key: s3Key, filePath: mongoDumpPath });
        results.uploads.push({ type: 'mongodb', ...uploaded });
        console.log(`[Backup] MongoDB dump uploaded: ${s3Key}`);
      } catch (error) {
        console.error('[Backup] MongoDB dump failed:', error.message);
        results.errors.push({ type: 'mongodb', error: error.message });
      }
    }

    // Samba domain backup
    if (includeSamba && config.includeSambaBackup) {
      try {
        console.log('[Backup] Starting Samba domain backup...');
        const sambaBackupPath = await runSambaBackup();
        const fileName = path.basename(sambaBackupPath);
        const s3Key = `${config.prefix}${timestamp}/${fileName}`;
        const uploaded = await uploadToS3({ s3Client, bucket: config.bucket, key: s3Key, filePath: sambaBackupPath });
        results.uploads.push({ type: 'samba', ...uploaded });
        console.log(`[Backup] Samba backup uploaded: ${s3Key}`);
      } catch (error) {
        console.error('[Backup] Samba backup failed:', error.message);
        results.errors.push({ type: 'samba', error: error.message });
      }
    }

    // Cleanup old backups
    const cleanup = await cleanupOldBackups({
      s3Client,
      bucket: config.bucket,
      prefix: config.prefix,
      retentionDays: config.retentionDays,
    });
    results.cleanup = cleanup;
  } finally {
    cleanupTmpFiles();
  }

  // Save last backup status
  await SettingsCollection.upsertAsync(
    { key: 'backup.lastRun' },
    {
      $set: {
        key: 'backup.lastRun',
        value: {
          timestamp: new Date(),
          uploads: results.uploads.length,
          errors: results.errors.length,
          details: results,
        },
      },
    }
  );

  return results;
}

// Tests S3 connection by listing the bucket
export async function testS3Connection({ endpoint, bucket, region, accessKeyId, secretAccessKey }) {
  const s3Client = createS3Client({ endpoint, region, accessKeyId, secretAccessKey });

  await s3Client.send(new ListObjectsV2Command({
    Bucket: bucket,
    MaxKeys: 1,
  }));

  return { success: true };
}
