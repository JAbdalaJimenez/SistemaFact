-- AlterTable: Vincular User de Prisma con auth.users de Supabase Auth y deprecar password local
ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "authUserId" UUID,
  ALTER COLUMN "password" DROP NOT NULL,
  ALTER COLUMN "password" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_authUserId_key" ON "public"."users"("authUserId");

