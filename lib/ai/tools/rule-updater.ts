import { tool } from 'ai';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { chat } from '@/lib/db/schema';
import type { TreasuryRuleData } from '@/lib/treasury/schema';
import { Client } from '@upstash/qstash';

const qstashClient = new Client({
  token:
    process.env.QSTASH_TOKEN ??
    (() => {
      throw new Error('QSTASH_TOKEN environment variable is required');
    })(),
});

// Use shared database connection
const client = postgres(
  process.env.POSTGRES_URL ??
    (() => {
      throw new Error('POSTGRES_URL environment variable is required');
    })(),
);
const db = drizzle(client);

export const ruleUpdater = (chatId: string) =>
  tool({
    description:
      'Update chat with treasury rule changes (create or modify) in unified Chat-as-Rule-Storage architecture',
    inputSchema: z.object({
      rule: z.any().describe('Updated treasury rule data'),
      name: z.string().describe('Rule name (becomes chat title)'),
      memo: z.string().optional().describe('Optional rule notes'),
    }),
    execute: async ({ rule, name, memo }) => {
      try {
        const treasuryRuleData = rule as TreasuryRuleData;

        // Get current chat data to check for existing schedule
        const currentChat = await db
          .select()
          .from(chat)
          .where(and(eq(chat.id, chatId), isNull(chat.deletedAt)))
          .limit(1);

        if (!currentChat.length) {
          return {
            success: false,
            error: 'Chat not found or has been deleted',
          };
        }

        const existingScheduleId = currentChat[0].scheduleId;
        const existingRuleData = currentChat[0]
          .ruleData as TreasuryRuleData | null;

        // Cancel existing execution (schedule or delayed message) if we're editing a rule that has one
        if (existingScheduleId && existingRuleData?.execution?.timing) {
          try {
            const existingTiming = existingRuleData.execution.timing;

            if (existingTiming === 'schedule') {
              await qstashClient.schedules.delete(existingScheduleId);
              console.log('Cancelled existing schedule:', existingScheduleId);
            } else if (existingTiming === 'once') {
              await qstashClient.messages.delete(existingScheduleId);
              console.log(
                'Cancelled existing delayed message:',
                existingScheduleId,
              );
            }
          } catch (error) {
            console.warn(
              'Failed to cancel existing execution:',
              existingScheduleId,
              error,
            );
            // Continue with the update even if cancellation fails
          }
        }

        // Create new QStash execution (schedule or delayed message) for rule execution
        let newScheduleId: any;

        if (
          treasuryRuleData.execution.timing === 'schedule' &&
          treasuryRuleData.execution.cron
        ) {
          // Create recurring schedule
          try {
            const scheduleResult = await qstashClient.schedules.create({
              destination: 'https://e755d9234b2f.ngrok-free.app/api/queue', // using ngrok webhook for now
              headers: {
                'Content-type': 'application/json',
                'Upstash-Deduplication-Id': chatId,
              },
              body: JSON.stringify({ chatId, ruleData: treasuryRuleData }),
              cron: treasuryRuleData.execution.cron,
            });
            newScheduleId = scheduleResult.scheduleId;
            console.log('Created QStash schedule ID:', newScheduleId);
          } catch (error) {
            console.error('Failed to create QStash schedule:', error);
            // Continue without schedule - rule will be saved but not scheduled
          }
        } else if (
          treasuryRuleData.execution.timing === 'once' &&
          treasuryRuleData.execution.at
        ) {
          // Create one-time delayed message
          try {
            const messageResult = await qstashClient.publishJSON({
              url: 'https://e755d9234b2f.ngrok-free.app/api/queue', // using ngrok webhook for now
              headers: {
                'Content-Type': 'application/json',
                'Upstash-Deduplication-Id': chatId,
              },
              body: { chatId, ruleData: treasuryRuleData },
              notBefore: treasuryRuleData.execution.at, // Unix timestamp
            });
            newScheduleId = messageResult.messageId;
            console.log('Created QStash delayed message ID:', newScheduleId);
          } catch (error) {
            console.error('Failed to create QStash delayed message:', error);
            // Continue without delayed message - rule will be saved but not scheduled
          }
        }

        // Update the chat with rule data and schedule ID
        const [updated] = await db
          .update(chat)
          .set({
            title: name, // Rule name becomes chat title
            original: treasuryRuleData.original, // Always update original text
            ruleData: treasuryRuleData, // Always update rule structure
            memo: memo || null,
            isActive: true, // Rule is active when saved
            scheduleId: newScheduleId, // Store the QStash schedule ID or message ID
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
            scheduleId: updated.scheduleId,
            scheduled: !!newScheduleId,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to update rule',
        };
      }
    },
  });
