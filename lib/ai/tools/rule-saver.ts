import { tool } from 'ai';
import { z } from 'zod';
import {
  saveRule,
  editRule,
  getRulesByUserId,
  getRuleById,
  deleteRuleById,
} from '@/lib/db/queries';
import type { TreasuryRuleData } from '@/lib/treasury/schema';
import type { ToolResponse } from '@/lib/treasury/types';

export const ruleSaver = tool({
  description: 'Save validated treasury rules to the database',
  inputSchema: z.object({
    rule: z.any().describe('The parsed and validated treasury rule to save'),
    name: z.string().describe('A descriptive name for the rule'),
    userId: z.string().describe('The ID of the user creating the rule'),
    memo: z.string().optional().describe('Optional human-readable description'),
    ruleId: z.string().optional().describe('Rule ID for updating existing rule (if not provided, creates new rule)'),
  }),
  execute: async ({ rule, name, userId, memo, ruleId }) => {
    try {
      const treasuryRuleData = rule as TreasuryRuleData;

      if (ruleId) {
        // Update existing rule
        const [updatedRule] = await editRule({
          id: ruleId,
          userId,
          name,
          ruleData: treasuryRuleData,
          memo,
        });

        if (!updatedRule) {
          return {
            success: false,
            error: 'Rule not found or permission denied',
          };
        }

        return {
          success: true,
          data: {
            ruleId: updatedRule.id,
            name: updatedRule.name,
            message: 'Treasury rule updated successfully',
            isUpdate: true,
          },
        };
      } else {
        // Create new rule
        const [savedRule] = await saveRule({
          name,
          original: treasuryRuleData.original,
          ruleData: treasuryRuleData,
          userId,
          memo,
        });

        return {
          success: true,
          data: {
            ruleId: savedRule.id,
            name: savedRule.name,
            message: 'Treasury rule created successfully',
            isUpdate: false,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save rule',
      };
    }
  },
});

export async function getTreasuryRules(
  userId: string,
): Promise<ToolResponse<any[]>> {
  try {
    const rules = await getRulesByUserId({ userId });

    return {
      success: true,
      data: rules,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch rules',
    };
  }
}

export async function getTreasuryRule(
  ruleId: string,
  userId: string,
): Promise<ToolResponse<any>> {
  try {
    const rule = await getRuleById({ id: ruleId, userId });

    if (!rule) {
      return {
        success: false,
        error: 'Rule not found',
      };
    }

    return {
      success: true,
      data: rule,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch rule',
    };
  }
}

export async function updateTreasuryRule(
  ruleId: string,
  userId: string,
  updates: {
    name?: string;
    ruleData?: TreasuryRuleData;
    isActive?: boolean;
    memo?: string;
  },
): Promise<ToolResponse<any>> {
  try {

    const [updatedRule] = await editRule({
      id: ruleId,
      userId,
      name: updates.name,
      ruleData: updates.ruleData,
      isActive: updates.isActive,
      memo: updates.memo,
    });

    if (!updatedRule) {
      return {
        success: false,
        error: 'Rule not found or permission denied',
      };
    }

    return {
      success: true,
      data: { rule: updatedRule, message: 'Rule updated successfully' },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update rule',
    };
  }
}

export async function deleteTreasuryRule(
  ruleId: string,
  userId: string,
): Promise<ToolResponse<any>> {
  try {
    const [deletedRule] = await deleteRuleById({ id: ruleId, userId });

    if (!deletedRule) {
      return {
        success: false,
        error: 'Rule not found or permission denied',
      };
    }

    return {
      success: true,
      data: { message: 'Rule deleted successfully' },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete rule',
    };
  }
}
