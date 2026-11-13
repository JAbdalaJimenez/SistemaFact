import { describe, it, expect, vi } from "vitest";
import { verifyMercadoPagoSignature } from "../src/lib/mercadopago";
import crypto from "crypto";

describe("Mercado Pago Webhook Signature Verification", () => {
  const secret = "test_webhook_secret_key_123456789";

  it("devuelve false si falta xSignature, xRequestId o dataId", () => {
    expect(verifyMercadoPagoSignature(null, "req-1", "data-1", secret)).toBe(false);
    expect(verifyMercadoPagoSignature("ts=1,v1=abc", null, "data-1", secret)).toBe(false);
    expect(verifyMercadoPagoSignature("ts=1,v1=abc", "req-1", null, secret)).toBe(false);
    expect(verifyMercadoPagoSignature("ts=1,v1=abc", "req-1", "", secret)).toBe(false);
  });

  it("verifica una firma HMAC-SHA256 válida correctamente", () => {
    const dataId = "payment_998877";
    const requestId = "req-uuid-4455";
    const ts = String(Math.floor(Date.now() / 1000));

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
    const xSignature = `ts=${ts},v1=${hash}`;

    const isValid = verifyMercadoPagoSignature(xSignature, requestId, dataId, secret);
    expect(isValid).toBe(true);
  });

  it("falla cerrado y rechaza si la firma está manipulada o el hash no coincide", () => {
    const dataId = "payment_998877";
    const requestId = "req-uuid-4455";
    const ts = String(Math.floor(Date.now() / 1000));

    const invalidHash = crypto
      .createHmac("sha256", "wrong_secret_key")
      .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
      .digest("hex");

    const xSignature = `ts=${ts},v1=${invalidHash}`;

    const isValid = verifyMercadoPagoSignature(xSignature, requestId, dataId, secret);
    expect(isValid).toBe(false);
  });
});

