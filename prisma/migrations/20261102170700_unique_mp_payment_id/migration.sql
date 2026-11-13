-- CreateIndex: Garantizar idempotencia de pagos de Mercado Pago a nivel de base de datos
CREATE UNIQUE INDEX IF NOT EXISTS "payments_mpPaymentId_key" ON "public"."payments"("mpPaymentId");

