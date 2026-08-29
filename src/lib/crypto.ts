'use server';

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export async function encryptApiKey(plainKey: string) {
  const masterKeyStr = process.env.APP_MASTER_ENCRYPTION_KEY;
  if (!masterKeyStr || masterKeyStr.length !== 64) {
    throw new Error('APP_MASTER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }
  
  const masterKey = Buffer.from(masterKeyStr, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  
  let encrypted = cipher.update(plainKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');
  
  let keyHint = '';
  if (plainKey.length > 10) {
    keyHint = `${plainKey.slice(0, 6)}...${plainKey.slice(-4)}`;
  } else {
    keyHint = '***';
  }

  return {
    encryptedKey: encrypted,
    iv: ivHex,
    authTag: authTag,
    keyHint
  };
}

export async function decryptApiKey(encryptedKey: string, ivHex: string, authTagHex: string): Promise<string> {
  const masterKeyStr = process.env.APP_MASTER_ENCRYPTION_KEY;
  if (!masterKeyStr || masterKeyStr.length !== 64) {
    throw new Error('APP_MASTER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }

  const masterKey = Buffer.from(masterKeyStr, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
