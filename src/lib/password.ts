import crypto from "crypto"

/**
 * Hash a password using Node's scrypt (no external deps).
 * Returns "salt:hash" in hex.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex")
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      else resolve(`${salt}:${derivedKey.toString("hex")}`)
    })
  })
}

/** Verify a password against a "salt:hash" string. */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      else resolve(crypto.timingSafeEqual(Buffer.from(hash, "hex"), derivedKey))
    })
  })
}
