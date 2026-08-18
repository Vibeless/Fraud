import { randomBytes } from "crypto";

const BASE62_CHARS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Encodes a buffer into a base62 string.
 */
export function encodeBase62(buffer: Buffer): string {
  let num = BigInt("0x" + buffer.toString("hex"));
  if (num === 0n) return "0";

  let result = "";
  const base = 62n;
  while (num > 0n) {
    const remainder = Number(num % base);
    result = BASE62_CHARS[remainder] + result;
    num = num / base;
  }
  return result;
}

export interface GeneratedApiKey {
  rawKey: string;
  keyPrefix: string;
}

/**
 * Generates an API key per AAD §3.1:
 * Format: ci_live_<32 random cryptographically-secure bytes, base62-encoded>
 * Prefix: First 12 characters (e.g. "ci_live_8f2a") stored in plaintext for dashboard display.
 */
export function generateApiKey(prefix = "ci_live_"): GeneratedApiKey {
  const bytes = randomBytes(32);
  const base62String = encodeBase62(bytes);
  const rawKey = `${prefix}${base62String}`;
  const keyPrefix = rawKey.slice(0, 12);

  return {
    rawKey,
    keyPrefix,
  };
}
