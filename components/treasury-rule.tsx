'use client';

import cx from 'classnames';
// import { format } from 'date-fns';
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ClockIcon,
  PersonIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from '@radix-ui/react-icons';

// Import the actual types from the schema
import type { TreasuryRuleData } from '@/lib/treasury/schema';
import { cronToHuman, formatCondition, formatPayment } from '@/lib/utils/cron';

// // Define the actual tool response types based on the implementations
// type ToolResult = {
//   success: boolean;
//   error?: string;
// } & (
//   | { data: TreasuryRuleData } // ruleParser result
//   | { data: { isValid: boolean } } // ruleValidator result
//   | { data: { riskLevel?: string; suggestions?: string[]; issues?: string[] } } // ruleEvaluator result
//   | { data: { chatId?: string; name?: string; message?: string } } // ruleUpdater result
//   | {
//       data: {
//         steps?: Array<{ thought: string; reasoning: string }>;
//         answer?: string;
//         message?: string;
//       };
//     } // ruleAnswer result
// );

export function TreasuryRule({
  toolType,
  result,
  args,
}: {
  toolType:
    | 'ruleParser'
    | 'ruleValidator'
    | 'ruleEvaluator'
    | 'ruleUpdater'
    | 'ruleAnswer';
  result?: any;
  args?: any;
}) {
  if (!result) {
    return (
      <div className="flex flex-col gap-3 rounded-xl p-4 border-2 border-dashed border-muted-foreground/20 bg-muted/50 max-w-screen-toast-mobile">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full size-4 border-b-2 border-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            {getToolLoadingMessage(toolType)}
          </span>
        </div>
      </div>
    );
  }

  if (result.error || !result.success) {
    return (
      <div className="flex flex-col gap-3 rounded-xl p-4 border border-red-200 bg-red-50 max-w-screen-toast-mobile">
        <div className="flex items-center gap-2">
          <CrossCircledIcon className="size-5 text-red-500" />
          <span className="text-sm font-semibold text-red-800">
            {getToolDisplayName(toolType)} Failed
          </span>
        </div>
        <p className="text-sm text-red-700">
          {result.error ||
            'An error occurred while processing the treasury rule.'}
        </p>
      </div>
    );
  }

  const { data } = result;

  return (
    <div className="flex flex-col gap-4 rounded-xl p-4 border border-green-200 bg-green-50 max-w-screen-toast-mobile">
      <div className="flex items-center gap-2">
        <CheckCircledIcon className="size-5 text-green-600" />
        <span className="text-sm font-semibold text-green-800">
          {getToolDisplayName(toolType)} Complete
        </span>
      </div>

      {/* Rule Parser Result */}
      {toolType === 'ruleParser' && 'data' in result && (
        <TreasuryRuleDisplay rule={result.data as TreasuryRuleData} />
      )}

      {/* Rule Validator Result */}
      {toolType === 'ruleValidator' && (
        <div className="flex items-center gap-2">
          <CheckCircledIcon className="size-4 text-green-600" />
          <span className="text-sm text-green-700">Rule validation passed</span>
        </div>
      )}

      {/* Rule Evaluator Result */}
      {toolType === 'ruleEvaluator' && 'data' in result && (
        <ConflictAnalysisDisplay
          hasConflicts={(result.data as any).hasConflicts}
          conflictDetails={(result.data as any).conflictDetails}
          suggestions={(result.data as any).suggestions}
        />
      )}

      {/* Rule Saver Result */}
      {toolType === 'ruleUpdater' && 'data' in result && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <PersonIcon className="size-4 text-green-600" />
            <span className="text-sm text-green-700">
              {(result.data as any).message || 'Rule saved successfully'}
            </span>
          </div>
          {(result.data as any).ruleId && (
            <p className="text-xs text-green-600">
              Rule ID: {(result.data as any).ruleId}
            </p>
          )}
          {(result.data as any).name && (
            <p className="text-xs text-green-600">
              Rule Name: {(result.data as any).name}
            </p>
          )}
          {(result.data as any).isUpdate !== undefined && (
            <p className="text-xs text-blue-600">
              {(result.data as any).isUpdate
                ? 'Updated existing rule'
                : 'Created new rule'}
            </p>
          )}
        </div>
      )}

      {/* Rule Answer Result */}
      {toolType === 'ruleAnswer' && 'data' in result && (
        <RuleAnswerDisplay
          steps={(result.data as any).steps}
          answer={(result.data as any).answer}
          message={(result.data as any).message}
        />
      )}
    </div>
  );
}

function TreasuryRuleDisplay({ rule }: { rule: TreasuryRuleData }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start gap-2">
        <ClockIcon className="size-4 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <span className="font-medium text-gray-800">Execution: </span>
          <div className="text-gray-700">
            {rule.execution.timing === 'once' && (
              <span>
                One-time execution
                {rule.execution.at
                  ? ` at ${new Date(rule.execution.at * 1000).toLocaleString()}`
                  : ''}
              </span>
            )}
            {rule.execution.timing === 'schedule' && (
              <div>
                <div className="font-medium text-gray-600">
                  {cronToHuman(rule.execution.cron || '')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Schedule: {rule.execution.cron}
                </div>
              </div>
            )}
            {rule.execution.timing === 'hook' && (
              <span>
                Webhook: {rule.execution.hooks?.map((h) => h.target).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <PersonIcon className="size-4 text-green-600 mt-0.5" />
        <div className="flex-1">
          <span className="font-medium text-gray-800">Payment: </span>
          <div className="text-gray-700">
            <div className="font-medium text-gray-800">
              {formatPayment(rule.payment)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Action: {rule.payment.action} | Currency: {rule.payment.currency}
            </div>
          </div>
        </div>
      </div>

      {rule.payment.action === 'split' && rule.payment.percentages && (
        <div className="ml-6 text-xs text-gray-600">
          {rule.payment.beneficiary.map((recipient, index) => (
            <div key={recipient}>
              {recipient}: {rule.payment.percentages?.[index]}%
            </div>
          ))}
        </div>
      )}

      {rule.conditions && rule.conditions.length > 0 && (
        <div className="flex items-start gap-2">
          <InfoCircledIcon className="size-4 text-purple-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-medium text-gray-800">Conditions: </span>
            <div className="text-gray-700">
              <div className="mb-1">
                {rule.conditions.length} condition
                {rule.conditions.length > 1 ? 's' : ''} defined
              </div>
              <div className="space-y-1">
                {rule.conditions.map((condition, index) => (
                  <div
                    key={`condition-${condition.logic || ''}-${condition.field}-${condition.operator}-${condition.value}`}
                    className="text-sm bg-purple-50 p-2 rounded border-l-2 border-purple-200"
                  >
                    <span className="text-purple-800">
                      {condition.logic && index > 0 && (
                        <span className="font-medium text-purple-600">
                          {condition.logic}{' '}
                        </span>
                      )}
                      {formatCondition(condition)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 p-3 bg-white rounded-lg border">
        <p className="text-xs text-gray-600 font-medium mb-1">
          Original Request:
        </p>
        <p className="text-sm text-gray-800">{rule.original}</p>
        {rule.memo && (
          <>
            <p className="text-xs text-gray-600 font-medium mb-1 mt-2">Memo:</p>
            <p className="text-sm text-gray-800">{rule.memo}</p>
          </>
        )}
      </div>
    </div>
  );
}

function ConflictAnalysisDisplay({
  hasConflicts,
  conflictDetails,
  suggestions,
}: {
  hasConflicts?: boolean;
  conflictDetails?: Array<{
    ruleId: string;
    ruleName: string;
    conflictType: 'schedule' | 'payment' | 'condition' | 'beneficiary';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  suggestions?: string[];
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low':
        return <InfoCircledIcon className="size-4" />;
      case 'medium':
        return <ExclamationTriangleIcon className="size-4" />;
      case 'high':
        return <CrossCircledIcon className="size-4" />;
      default:
        return <InfoCircledIcon className="size-4" />;
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'schedule':
        return 'Schedule Conflict';
      case 'payment':
        return 'Payment Conflict';
      case 'condition':
        return 'Condition Conflict';
      case 'beneficiary':
        return 'Beneficiary Conflict';
      default:
        return 'Conflict';
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        {hasConflicts ? (
          <>
            <ExclamationTriangleIcon className="size-4 text-orange-600" />
            <span className="font-medium text-orange-800">
              {conflictDetails?.length || 0} Conflict
              {(conflictDetails?.length || 0) !== 1 ? 's' : ''} Detected
            </span>
          </>
        ) : (
          <>
            <CheckCircledIcon className="size-4 text-green-600" />
            <span className="font-medium text-green-800">
              No Conflicts Found
            </span>
          </>
        )}
      </div>

      {conflictDetails && conflictDetails.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-gray-700 mb-2">Conflict Details:</p>
          {conflictDetails.map((conflict, index) => (
            <div
              key={`conflict-${conflict.ruleId}-${index}`}
              className={cx(
                'p-3 rounded-lg border',
                getSeverityColor(conflict.severity),
              )}
            >
              <div className="flex items-start gap-2 mb-2">
                {getSeverityIcon(conflict.severity)}
                <div className="flex-1">
                  <p className="font-medium text-xs mb-1">
                    {getConflictTypeLabel(conflict.conflictType)} (
                    {conflict.severity} severity)
                  </p>
                  <p className="text-xs text-gray-600 mb-1">
                    Rule: {conflict.ruleName} (ID: {conflict.ruleId})
                  </p>
                  <p className="text-xs">{conflict.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div>
          <p className="font-medium text-blue-700 mb-1">
            {hasConflicts ? 'Resolution Suggestions:' : 'Recommendations:'}
          </p>
          <ul className="list-disc list-inside space-y-1">
            {suggestions.map((suggestion, index) => (
              <li
                key={`suggestion-${suggestion.slice(0, 20).replace(/\s/g, '-')}`}
                className="text-blue-600 text-xs"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RuleAnswerDisplay({
  steps,
  answer,
  message,
}: {
  steps?: Array<{ thought: string; reasoning: string }>;
  answer?: string;
  message?: string;
}) {
  return (
    <div className="space-y-3 text-sm">
      {message && <p className="text-green-700 font-medium">{message}</p>}

      {steps && steps.length > 0 && (
        <div>
          <p className="font-medium text-blue-700 mb-2">Process Steps:</p>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={`step-${step.thought}-${index}`}
                className="p-2 bg-white rounded border"
              >
                <p className="font-medium text-xs text-blue-600 mb-1">
                  Step {index + 1}: {step.thought}
                </p>
                <p className="text-xs text-gray-700">{step.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {answer && (
        <div className="p-3 bg-white rounded-lg border">
          <p className="text-xs text-gray-600 font-medium mb-1">
            Final Answer:
          </p>
          <p className="text-sm text-gray-800">{answer}</p>
        </div>
      )}
    </div>
  );
}

function getToolDisplayName(toolType: string): string {
  switch (toolType) {
    case 'ruleParser':
      return 'Rule Parser';
    case 'ruleValidator':
      return 'Rule Validator';
    case 'ruleEvaluator':
      return 'Rule Evaluator';
    case 'ruleUpdater':
      return 'Rule Updater';
    case 'ruleAnswer':
      return 'Treasury Rule Process';
    default:
      return 'Treasury Tool';
  }
}

function getToolLoadingMessage(toolType: string): string {
  switch (toolType) {
    case 'ruleParser':
      return 'Parsing treasury rule...';
    case 'ruleValidator':
      return 'Validating rule structure...';
    case 'ruleEvaluator':
      return 'Evaluating rule for issues...';
    case 'ruleUpdater':
      return 'Updating rule in chat...';
    case 'ruleAnswer':
      return 'Finalizing treasury process...';
    default:
      return 'Processing treasury operation...';
  }
}
