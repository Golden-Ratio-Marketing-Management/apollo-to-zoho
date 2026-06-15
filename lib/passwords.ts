import crypto from "node:crypto"

const keyLength = 64

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url")
  const hash = await scrypt(password, salt)
  return `scrypt:${salt}:${hash}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [version, salt, hash] = storedHash.split(":")

  if (version !== "scrypt" || !salt || !hash) {
    return false
  }

  const candidate = await scrypt(password, salt)
  const candidateBuffer = Buffer.from(candidate, "base64url")
  const hashBuffer = Buffer.from(hash, "base64url")

  return (
    candidateBuffer.length === hashBuffer.length &&
    crypto.timingSafeEqual(candidateBuffer, hashBuffer)
  )
}

function scrypt(password: string, salt: string) {
  return new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }

      resolve(derivedKey.toString("base64url"))
    })
  })
}
