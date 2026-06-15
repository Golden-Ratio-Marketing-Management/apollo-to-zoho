import crypto from "node:crypto"

const algorithm = "aes-256-gcm"
const secretKey = process.env.SECRET_KEY

if (!secretKey) {
  throw new Error("SECRET_KEY environment variable is required")
}

const key = crypto.createHash("sha256").update(secretKey).digest()

export function encrypt(data: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    "gcm",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":")
}

export function decrypt(data: string) {
  const [version, iv, authTag, encrypted] = data.split(":")

  if (version !== "gcm" || !iv || !authTag || !encrypted) {
    throw new Error("Unsupported encrypted payload")
  }

  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, "base64url"),
  )
  decipher.setAuthTag(Buffer.from(authTag, "base64url"))

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
