import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a consistent 32-byte key from a secret string or generates a default demo key
 */
export function getEncryptionKey(secret?: string): Buffer {
  const source = secret || process.env.STORAGE_MASTER_KEY || "medichain-mst-buildathon-demo-key-2026";
  return crypto.createHash("sha256").update(source).digest();
}

export interface EncryptedPayload {
  encryptedData: string; // base64
  iv: string;            // hex
  authTag: string;       // hex
  fileHash: string;      // 0x-prefixed SHA-256 hex string (bytes32 format)
}

/**
 * Encrypts a buffer or string using AES-256-GCM and computes its SHA-256 integrity hash
 */
export function encryptRecord(data: Buffer | string, secretKey?: Buffer): EncryptedPayload {
  const key = secretKey || getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");

  // Compute SHA-256 hash of the plaintext (integrity check for on-chain registry)
  const fileHash = "0x" + crypto.createHash("sha256").update(buffer).digest("hex");

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted.toString("base64"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    fileHash: fileHash,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload
 */
export function decryptRecord(
  encryptedBase64: string,
  ivHex: string,
  authTagHex: string,
  secretKey?: Buffer
): Buffer {
  const key = secretKey || getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encryptedBuffer = Buffer.from(encryptedBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}
