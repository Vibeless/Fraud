import * as argon2 from "argon2";

/**
 * Shared Argon2id hashing utility to ensure consistent cost parameters and algorithms
 * across password and API key hashing, while allowing distinct peppers per context.
 * See AAD §3.1 and Deployment Architecture §7.
 */
export async function hashSecret(
  secret: string,
  pepper?: string,
): Promise<string> {
  const options: argon2.Options = {
    type: argon2.argon2id,
  };
  if (pepper) {
    options.secret = Buffer.from(pepper);
  }
  return argon2.hash(secret, options);
}

export async function verifySecret(
  hash: string,
  secret: string,
  pepper?: string,
): Promise<boolean> {
  const options: argon2.Options = {};
  if (pepper) {
    options.secret = Buffer.from(pepper);
  }
  try {
    return await argon2.verify(hash, secret, options);
  } catch {
    return false;
  }
}
