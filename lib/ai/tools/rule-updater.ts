import { tool } from 'ai';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { chat } from '@/lib/db/schema';
import type { TreasuryRuleData } from '@/lib/treasury/schema';

// Use shared database connection
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export const createRuleUpdater = (chatId: string) => tool({
  description: 'Update chat with treasury rule changes (create or modify) in unified Chat-as-Rule-Storage architecture',
  inputSchema: z.object({
    rule: z.any().describe('Updated treasury rule data'),
    name: z.string().describe('Rule name (becomes chat title)'),
    memo: z.string().optional().describe('Optional rule notes'),
  }),
  execute: async ({ rule, name, memo }) => {
    try {
      const treasuryRuleData = rule as TreasuryRuleData;

      // Update the chat with rule data
      const [updated] = await db
        .update(chat)
        .set({
          title: name, // Rule name becomes chat title
          original: treasuryRuleData.original, // Always update original text
          ruleData: treasuryRuleData, // Always update rule structure
          memo: memo || null,
          isActive: true, // Rule is active when saved
          updatedAt: new Date(),
        })
        .where(and(eq(chat.id, chatId), isNull(chat.deletedAt))) // Only update non-deleted chats
        .returning();

      if (!updated) {
        return {
          success: false,
          error: 'Chat not found or has been deleted',
        };
      }

      return {
        success: true,
        data: {
          chatId: updated.id,
          name: updated.title,
          message: 'Treasury rule updated successfully in chat',
          ruleData: updated.ruleData,
          isActive: updated.isActive,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update rule',
      };
    }
  },
});

// Default export for backward compatibility (will require chatId in input)
export const ruleUpdater = tool({
  description: 'Update chat with treasury rule changes (create or modify)',
  inputSchema: z.object({
    rule: z.any().describe('Updated treasury rule data'),
    name: z.string().describe('Rule name (becomes chat title)'),
    memo: z.string().optional().describe('Optional rule notes'),
    chatId: z.string().describe('Chat ID to update with rule data'),
  }),
  execute: async ({ rule, name, memo, chatId }) => {
    try {
      const treasuryRuleData = rule as TreasuryRuleData;

      // Update the chat with rule data
      const [updated] = await db
        .update(chat)
        .set({
          title: name, // Rule name becomes chat title
          original: treasuryRuleData.original, // Always update original text
          ruleData: treasuryRuleData, // Always update rule structure
          memo: memo || null,
          isActive: true, // Rule is active when saved
          updatedAt: new Date(),
        })
        .where(and(eq(chat.id, chatId), isNull(chat.deletedAt))) // Only update non-deleted chats
        .returning();

      if (!updated) {
        return {
          success: false,
          error: 'Chat not found or has been deleted',
        };
      }

      return {
        success: true,
        data: {
          chatId: updated.id,
          name: updated.title,
          message: 'Treasury rule updated successfully in chat',
          ruleData: updated.ruleData,
          isActive: updated.isActive,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update rule',
      };
    }
  },
});