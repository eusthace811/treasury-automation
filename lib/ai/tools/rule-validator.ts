import { tool } from 'ai';
import { z } from 'zod';
import { isValidCron } from 'cron-validator';
import { treasuryRuleSchema } from '@/lib/treasury/schema';
import { treasuryContextResolver } from '@/lib/treasury/context-resolver';
import { safeFormulaEvaluator } from '@/lib/treasury/formula-evaluator';
import { beneficiariesData, accountsData } from '@/data/mockup';

export const ruleValidator = tool({
  description:
    'Validate treasury rule object against the schema and business logic',
  inputSchema: z.object({
    rule: z.any().describe('The treasury rule object to validate'),
  }),
  execute: async ({ rule }) => {
    try {
      // Validate against Zod schema
      treasuryRuleSchema.parse(rule);

      // Additional business logic validation
      const validationErrors: string[] = [];

      // Validate cron expression if it's a scheduled rule
      if (rule.execution?.timing === 'schedule' && rule.execution?.cron) {
        // Validate cron expression using cron-validator
        if (!isValidCron(rule.execution.cron)) {
          validationErrors.push(
            `execution.cron: Invalid cron expression "${rule.execution.cron}". Must be a valid UNIX cron format (5 fields).`,
          );
        }
      }

      // Validate UNIX timestamp if it's a one-time rule
      if (rule.execution?.timing === 'once' && rule.execution?.at) {
        const timestamp = rule.execution.at;

        // Check if it's a valid number
        if (typeof timestamp !== 'number' || !Number.isInteger(timestamp)) {
          validationErrors.push(
            `execution.at: Invalid timestamp format. Must be a valid UNIX timestamp (integer).`,
          );
        } else {
          // Check if timestamp is in a reasonable range (not in the past, not too far in future)
          const now = Math.floor(Date.now() / 1000);
          const oneYearFromNow = now + 365 * 24 * 60 * 60; // 1 year in seconds

          if (timestamp < now) {
            validationErrors.push(
              `execution.at: Timestamp ${timestamp} is in the past. Must be a future timestamp.`,
            );
          } else if (timestamp > oneYearFromNow) {
            validationErrors.push(
              `execution.at: Timestamp ${timestamp} is too far in the future (more than 1 year). Please use a reasonable future date.`,
            );
          }
        }
      }

      // Validate payment amounts with new source + formula structure
      if (rule.payment?.amount && typeof rule.payment.amount === 'object') {
        const amountConfig = rule.payment.amount;

        // Validate source field if present (new structure)
        if ('source' in amountConfig && amountConfig.source) {
          // Check if source is a valid path that can be resolved
          if (!treasuryContextResolver.validateSource(amountConfig.source)) {
            validationErrors.push(
              `payment.amount.source: Invalid source path "${amountConfig.source}". Must be a valid data source path.`,
            );
          }

          // Validate formula if present
          if ('formula' in amountConfig && amountConfig.formula) {
            if (!safeFormulaEvaluator.validateFormula(amountConfig.formula)) {
              validationErrors.push(
                `payment.amount.formula: Invalid formula "${amountConfig.formula}". Must be a safe mathematical expression.`,
              );
            }
          }
        }
      }

      // Validate payment type-specific business logic
      if (rule.payment?.action) {
        switch (rule.payment.action) {
          case 'simple':
            // Simple payments must have exactly one beneficiary
            if (rule.payment.beneficiary.length !== 1) {
              validationErrors.push(
                `payment: Simple payments must have exactly one beneficiary, but ${rule.payment.beneficiary.length} were provided.`,
              );
            }
            break;

          case 'split':
            // Split payment validation
            if (rule.payment.beneficiary && rule.payment.percentages) {
              const {
                beneficiary: beneficiaryCollections,
                tags,
                percentages,
              } = rule.payment;

              if (tags && tags.length > 0) {
                // Tag-based resolution validation
                let totalResolvedBeneficiaries = 0;

                for (const collection of beneficiaryCollections) {
                  if (collection === 'employees') {
                    const filteredEmployees =
                      beneficiariesData.employees.filter(
                        (emp) =>
                          emp.tags &&
                          tags.some((tag: string) => emp.tags.includes(tag)),
                      );
                    totalResolvedBeneficiaries += filteredEmployees.length;
                  } else if (collection === 'contractors') {
                    const filteredContractors =
                      beneficiariesData.contractors.filter(
                        (contractor) =>
                          contractor.tags &&
                          tags.some((tag: string) =>
                            contractor.tags.includes(tag),
                          ),
                      );
                    totalResolvedBeneficiaries += filteredContractors.length;
                  }
                }

                // Check if resolved beneficiaries count matches percentages count
                if (totalResolvedBeneficiaries !== percentages.length) {
                  validationErrors.push(
                    `payment: Split payment with tags resolved ${totalResolvedBeneficiaries} beneficiaries but ${percentages.length} percentages were provided.
                    Collections: ${beneficiaryCollections.join(', ')}, Tags: ${tags.join(', ')}. 
                    Please adjust percentages to match the expected number of beneficiaries, or modify the tags/collections.`,
                  );
                }

                // Check if any beneficiaries were found at all
                if (totalResolvedBeneficiaries === 0) {
                  validationErrors.push(
                    `payment: No beneficiaries found matching the specified collections (${beneficiaryCollections.join(', ')}) and tags (${tags.join(', ')}).
                    Please verify that beneficiaries exist with those tags.`,
                  );
                }
              } else {
                // Non-tag-based validation: just check beneficiary count matches percentages count
                if (beneficiaryCollections.length !== percentages.length) {
                  validationErrors.push(
                    `payment: Split payment has ${beneficiaryCollections.length} beneficiaries but ${percentages.length} percentages were provided.
                    Beneficiaries: ${beneficiaryCollections.join(', ')}.
                    Each beneficiary must have a corresponding percentage.`,
                  );
                }
              }
            }
            break;

          case 'calculation':
            // Calculation payments
            break;

          case 'leftover':
            // Leftover payments require source account validation
            if (!rule.payment.source || rule.payment.source.trim() === '') {
              validationErrors.push(
                `payment: Leftover payments require a valid source account to calculate remaining balance.`,
              );
            }
            // Leftover payments should use dynamic amounts to calculate remaining balance
            if (typeof rule.payment.amount === 'string') {
              validationErrors.push(
                `payment: Leftover payments should use dynamic amounts to calculate remaining balance, but a fixed amount "${rule.payment.amount}" was provided.`,
              );
            }
            break;

          case 'batch':
            // Batch payment validation is already handled by schema .refine()
            // Additional business logic can be added here if needed
            break;
        }
      }

      // Universal payment validations
      if (rule.payment) {
        // Validate source account exists
        if (rule.payment.source) {
          const sourceAccount = accountsData.accounts.find(
            (acc) =>
              acc.slug === rule.payment.source ||
              acc.name === rule.payment.source ||
              acc.id === rule.payment.source,
          );
          if (!sourceAccount) {
            validationErrors.push(
              `payment.source: Account "${rule.payment.source}" not found. Available accounts: ${accountsData.accounts.map((acc) => acc.slug).join(', ')}`,
            );
          } else if (!sourceAccount.isActive) {
            validationErrors.push(
              `payment.source: Account "${rule.payment.source}" is not active and cannot be used for payments.`,
            );
          }
        }

        // Validate beneficiary collections exist
        if (
          rule.payment.beneficiary &&
          Array.isArray(rule.payment.beneficiary)
        ) {
          const validCollections = [
            'employees',
            'contractors',
            'invoices',
            'treasury',
            'accounts',
          ];
          const validAccountSlugs = accountsData.accounts.map(
            (acc) => acc.slug,
          );

          for (const beneficiary of rule.payment.beneficiary) {
            const isValidCollection = validCollections.includes(beneficiary);
            const isValidAccountSlug = validAccountSlugs.includes(beneficiary);
            const isWalletAddress =
              beneficiary.startsWith('0x') && beneficiary.length === 42;

            if (!isValidCollection && !isValidAccountSlug && !isWalletAddress) {
              // Check if it might be an individual name that exists in our data
              const existsInEmployees = beneficiariesData.employees.some(
                (emp) => emp.name === beneficiary,
              );
              const existsInContractors = beneficiariesData.contractors.some(
                (contractor) => contractor.name === beneficiary,
              );

              if (!existsInEmployees && !existsInContractors) {
                validationErrors.push(
                  `payment.beneficiary: "${beneficiary}" is not a valid collection (${validCollections.join(', ')}), account slug, wallet address, or known individual.
                  Use collection names instead of individual names for better rule management.`,
                );
              }
            }
          }
        }

        // Validate currency format
        if (rule.payment.currency) {
          const validCurrencies = ['USDC', 'ETH', 'BTC', 'USDT', 'SOL'];
          if (!validCurrencies.includes(rule.payment.currency)) {
            validationErrors.push(
              `payment.currency: "${rule.payment.currency}" may not be supported. Common currencies: ${validCurrencies.join(', ')}`,
            );
          }
        }

        // Validate amount is positive for fixed amounts
        if (typeof rule.payment.amount === 'string') {
          const amountNumber = Number.parseFloat(rule.payment.amount);
          if (Number.isNaN(amountNumber) || amountNumber <= 0) {
            validationErrors.push(
              `payment.amount: Fixed amount "${rule.payment.amount}" must be a positive number.`,
            );
          }
        }
      }

      // Return validation results
      if (validationErrors.length > 0) {
        return {
          success: true,
          data: {
            isValid: false,
            errors: validationErrors,
            message: 'Rule validation failed',
          },
        };
      }

      return {
        success: true,
        data: {
          isValid: true,
          message: 'Rule is valid and conforms to schema',
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: true,
          data: {
            isValid: false,
            errors: error.errors.map(
              (err) => `${err.path.join('.')}: ${err.message}`,
            ),
            message: 'Rule validation failed',
          },
        };
      }

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to validate rule',
      };
    }
  },
});
