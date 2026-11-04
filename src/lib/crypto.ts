import "server-only";
import crypto from "crypto";
import { env } from "./env";
import {
  encryptSecretWithMasterKey,
  decryptSecretWithMasterKey,
  maskSecretWithMasterKey,
  signExternalReferenceWithMasterKey,
  verifyExternalReferenceWithMasterKey,
  SignedExternalRefPayload,
} from "./crypto-core";

export type { SignedExternalRefPayload };

/**
 * Obtiene el material de clave maestro de 32 bytes validando el entorno.
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
 * Cifra un secreto en reposo con AES-256-GCM.
 */
export function encryptSecret(plaintext: string): string {
  return encryptSecretWithMasterKey(plaintext, getMasterKeyMaterial());
}

/**
 * Descifra un secreto almacenado con AES-256-GCM.
 */
export function decryptSecret(stored: string | null | undefined): string {
  return decryptSecretWithMasterKey(stored, getMasterKeyMaterial());
}

/**
 * Devuelve solo los últimos 4 caracteres enmascarados para mostrar en la UI.
 */
export function maskSecret(stored: string | null | undefined): string {
  return maskSecretWithMasterKey(stored, getMasterKeyMaterial());
}

/**
 * Firma criptográficamente el external_reference enviado a Mercado Pago
 * usando la subclave HMAC derivada por HKDF de ENCRYPTION_KEY.
 */
export function signExternalReference(payload: SignedExternalRefPayload): string {
  return signExternalReferenceWithMasterKey(payload, getMasterKeyMaterial());
}

/**
 * Verifica el external_reference firmado con comparación en tiempo constante.
 */
export function verifyExternalReference(
  raw: string | null | undefined
): SignedExternalRefPayload | null {
  return verifyExternalReferenceWithMasterKey(raw, getMasterKeyMaterial());
}
