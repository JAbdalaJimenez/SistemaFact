import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  encryptSecretWithMasterKey,
  decryptSecretWithMasterKey,
  maskSecretWithMasterKey,
  signExternalReferenceWithMasterKey,
  verifyExternalReferenceWithMasterKey,
  deriveSubkeyWithMasterKey,
} from "../src/lib/crypto-core";

describe("crypto-core (AES-256-GCM y HKDF)", () => {
  const masterKey = crypto.randomBytes(32);

  it("deriva subclaves deterministas e independientes con HKDF", () => {
    const keyAes1 = deriveSubkeyWithMasterKey(masterKey, "electrocba-aes-gcm-key");
    const keyAes2 = deriveSubkeyWithMasterKey(masterKey, "electrocba-aes-gcm-key");
    const keyHmac = deriveSubkeyWithMasterKey(masterKey, "electrocba-hmac-extref-key");

    expect(keyAes1.length).toBe(32);
    expect(keyHmac.length).toBe(32);
    expect(keyAes1.equals(keyAes2)).toBe(true);
    expect(keyAes1.equals(keyHmac)).toBe(false);
  });

  it("cifra y descifra correctamente un secreto con AES-256-GCM", () => {
    const plain = "APP_USR-1234567890-test-token-secret";
    const encrypted = encryptSecretWithMasterKey(plain, masterKey);

    expect(encrypted.startsWith("enc:v1:")).toBe(true);
    expect(encrypted).not.toContain(plain);

    const decrypted = decryptSecretWithMasterKey(encrypted, masterKey);
    expect(decrypted).toBe(plain);
  });

  it("es idempotente al intentar cifrar un secreto ya cifrado", () => {
    const plain = "APP_USR-test-token";
    const encrypted = encryptSecretWithMasterKey(plain, masterKey);
    const reEncrypted = encryptSecretWithMasterKey(encrypted, masterKey);

    expect(reEncrypted).toBe(encrypted);
  });

  it("enmascara un secreto mostrando solo los últimos 4 caracteres", () => {
    const plain = "APP_USR-abcdefgh1234";
    const encrypted = encryptSecretWithMasterKey(plain, masterKey);
    const masked = maskSecretWithMasterKey(encrypted, masterKey);

    expect(masked).toBe("••••••••1234");
  });

  it("firma y valida un external_reference correctamente", () => {
    const payload = {
      organizationId: "org_cba_123",
      jobId: "job_456",
      quoteId: "quote_789",
      expectedAmount: 150000,
    };

    const signed = signExternalReferenceWithMasterKey(payload, masterKey);
    expect(signed).toContain(".");

    const verified = verifyExternalReferenceWithMasterKey(signed, masterKey);
    expect(verified).not.toBeNull();
    expect(verified?.organizationId).toBe("org_cba_123");
    expect(verified?.expectedAmount).toBe(150000);
  });

  it("rechaza un external_reference adulterado o con firma inválida", () => {
    const payload = {
      organizationId: "org_cba_123",
      expectedAmount: 150000,
    };

    const signed = signExternalReferenceWithMasterKey(payload, masterKey);
    const [b64] = signed.split(".");
    const tampered = `${b64}.invalidsignaturehex1234567890abcdef`;

    const verified = verifyExternalReferenceWithMasterKey(tampered, masterKey);
    expect(verified).toBeNull();
  });
});

