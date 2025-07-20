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

        // Cancel existing schedule if we're editing a rule that has one
        if (existingScheduleId) {
          try {
            await qstashClient.schedules.delete(existingScheduleId);
            console.log('Cancelled existing schedule:', existingScheduleId);
          } catch (error) {
            console.warn(
              'Failed to cancel existing schedule:',
              existingScheduleId,
              error,
            );
            // Continue with the update even if cancellation fails
          }
        }

        // Create new QStash schedule for rule execution
        let newScheduleId: any;
        if (
          treasuryRuleData.execution.timing === 'schedule' &&
          treasuryRuleData.execution.cron
        ) {
          try {
            newScheduleId = await qstashClient.schedules.create({
              destination: 'https://e755d9234b2f.ngrok-free.app/api/queue', // using ngrok webhook for now
              headers: {
                'Content-type': 'application/json',
                'Upstash-Deduplication-Id': chatId,
              },
              body: JSON.stringify({ chatId, ruleData: treasuryRuleData }),
              cron: treasuryRuleData.execution.cron,
            });
            console.log('Created QStash schedule ID:', newScheduleId);
          } catch (error) {
            console.error('Failed to create QStash schedule:', error);
            // Continue without schedule - rule will be saved but not scheduled
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
            scheduleId: newScheduleId.scheduleId, // Store the QStash schedule ID
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

// Default export for backward compatibility (will require chatId in input)
// export const ruleUpdater = tool({
//   description: 'Update chat with treasury rule changes (create or modify)',
//   inputSchema: z.object({
//     rule: z.any().describe('Updated treasury rule data'),
//     name: z.string().describe('Rule name (becomes chat title)'),
//     memo: z.string().optional().describe('Optional rule notes'),
//     chatId: z.string().describe('Chat ID to update with rule data'),
//   }),
//   execute: async ({ rule, name, memo, chatId }) => {
//     try {
//       const treasuryRuleData = rule as TreasuryRuleData;

//       // Update the chat with rule data
//       const [updated] = await db
//         .update(chat)
//         .set({
//           title: name, // Rule name becomes chat title
//           original: treasuryRuleData.original, // Always update original text
//           ruleData: treasuryRuleData, // Always update rule structure
//           memo: memo || null,
//           isActive: true, // Rule is active when saved
//           updatedAt: new Date(),
//         })
//         .where(and(eq(chat.id, chatId), isNull(chat.deletedAt))) // Only update non-deleted chats
//         .returning();

//       if (!updated) {
//         return {
//           success: false,
//           error: 'Chat not found or has been deleted',
//         };
//       }

//       return {
//         success: true,
//         data: {
//           chatId: updated.id,
//           name: updated.title,
//           message: 'Treasury rule updated successfully in chat',
//           ruleData: updated.ruleData,
//           isActive: updated.isActive,
//         },
//       };
//     } catch (error) {
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : 'Failed to update rule',
//       };
//     }
//   },
// });
