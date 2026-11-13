// Setup de variables de entorno para Vitest
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/electrocba",
  DIRECT_URL: "postgresql://postgres:postgres@localhost:5432/electrocba",
  NEXT_PUBLIC_SUPABASE_URL: "https://example-test.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key_12345",
  SUPABASE_SERVICE_ROLE_KEY: "sb_service_role_test_key_123456789",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  MERCADO_PAGO_WEBHOOK_SECRET: "test_webhook_secret_key_123456789",
});
