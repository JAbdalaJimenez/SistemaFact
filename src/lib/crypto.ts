import "server-only";
import crypto from "crypto";
import { env } from "./env";

const ENCRYPTION_PREFIX = "enc:v1:";

/**
 * Obtiene el material de clave maestro de 32 bytes.
 */
function getMasterKeyMaterial(): Buffer {
  if (env.ENCRYPTION_KEY && /^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_KEY)) {
    return Buffer.from(env.ENCRYPTION_KEY, "hex");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY válida de 64 caracteres hex es obligatoria en producción.");
  }
  // En desarrollo local sin ENCRYPTION_KEY explícita, derivar 32 bytes determinísticos
  return crypto.createHash("sha256").update(env.SUPABASE_SERVICE_ROLE_KEY).digest();
}

/**
 * Deriva subclaves independientes mediante HKDF (RFC 5869) usando SHA-256:
 * - Una para AES-256-GCM (cifrado en reposo).
 * - Otra para HMAC-SHA256 (firma criptográfica interna de external_reference).
 */
function deriveSubkey(info: "electrocba-aes-gcm-key" | "electrocba-hmac-extref-key"): Buffer {
  const masterKey = getMasterKeyMaterial();
  const derived = crypto.hkdfSync("sha256", masterKey, Buffer.alloc(0), Buffer.from(info, "utf8"), 32);
  return Buffer.from(derived);
}

function getAesKey(): Buffer {
  return deriveSubkey("electrocba-aes-gcm-key");
}

function getHmacKey(): Buffer {
  return deriveSubkey("electrocba-hmac-extref-key");
}

/**
 * Cifra un secreto en reposo con AES-256-GCM.
 */
export function encryptSecret(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith(ENCRYPTION_PREFIX)) return trimmed;

  const key = getAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Descifra un secreto almacenado con AES-256-GCM.
 */
export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return "";
  const trimmed = stored.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith(ENCRYPTION_PREFIX)) {
    return trimmed;
  }

  const rawParts = trimmed.slice(ENCRYPTION_PREFIX.length).split(":");
  if (rawParts.length !== 3) {
    throw new Error("Formato de secreto cifrado inválido.");
  }

  const [ivHex, authTagHex, cipherHex] = rawParts;
  const key = getAesKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Devuelve solo los últimos 4 caracteres enmascarados para mostrar en la UI.
 */
export function maskSecret(stored: string | null | undefined): string {
  if (!stored) return "";
  try {
    const plain = decryptSecret(stored);
    if (!plain) return "";
    const last4 = plain.slice(-4);
    return `••••••••${last4}`;
  } catch {
    return "••••••••";
  }
}

export interface SignedExternalRefPayload {
  organizationId: string;
  jobId?: string;
  quoteId?: string;
  expectedAmount: number;
}

/**
 * Firma criptográficamente el external_reference enviado a Mercado Pago
 * usando la subclave HMAC derivada por HKDF de ENCRYPTION_KEY.
 */
export function signExternalReference(payload: SignedExternalRefPayload): string {
  const dataB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getHmacKey())
    .update(dataB64)
    .digest("hex");
  return `${dataB64}.${sig}`;
}

/**
 * Verifica el external_reference firmado con comparación en tiempo constante.
 */
export function verifyExternalReference(
  raw: string | null | undefined
): SignedExternalRefPayload | null {
  if (!raw || typeof raw !== "string") return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;

  const [dataB64, sigHex] = parts;
  if (!dataB64 || !sigHex) return null;

  try {
    const expectedSigHex = crypto
      .createHmac("sha256", getHmacKey())
      .update(dataB64)
      .digest("hex");

    const a = Buffer.from(sigHex, "hex");
    const b = Buffer.from(expectedSigHex, "hex");
    if (a.length === 0 || a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    const parsed = JSON.parse(Buffer.from(dataB64, "base64url").toString("utf8"));
    if (
      !parsed ||
      typeof parsed.organizationId !== "string" ||
      typeof parsed.expectedAmount !== "number"
    ) {
      return null;
    }
    return parsed as SignedExternalRefPayload;
  } catch {
    return null;
  }
}
