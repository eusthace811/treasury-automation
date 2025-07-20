-- Add rule fields to Chat table to implement "one chat = one rule" architecture
-- This unifies chat conversations with treasury rule management

-- Add rule-specific fields to Chat table
ALTER TABLE "Chat" ADD COLUMN "original" text;
ALTER TABLE "Chat" ADD COLUMN "ruleData" jsonb;
ALTER TABLE "Chat" ADD COLUMN "isActive" boolean DEFAULT false;
ALTER TABLE "Chat" ADD COLUMN "memo" text;
ALTER TABLE "Chat" ADD COLUMN "updatedAt" timestamp DEFAULT NOW();
ALTER TABLE "Chat" ADD COLUMN "deletedAt" timestamp;

-- Create performance indexes for rule queries
CREATE INDEX "idx_chat_active_rules" ON "Chat"("isActive", "deletedAt") WHERE "ruleData" IS NOT NULL;
CREATE INDEX "idx_chat_deleted_at" ON "Chat"("deletedAt");