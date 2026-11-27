-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN "codeHash" TEXT;
ALTER TABLE "PasswordResetToken" ADD COLUMN "codeAttempts" INTEGER NOT NULL DEFAULT 0;
