'use client';

import { useRuleTest } from '@/contexts/rule-test-context';
import { Button } from '@/components/ui/button';
import {
  XIcon,
  PlayIcon,
  LoaderIcon,
  RotateCcwIcon,
  ClockIcon,
  CalendarIcon,
  ZapIcon,
  CreditCardIcon,
  UsersIcon,
  CheckCircleIcon,
  FileTextIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatAmount, formatTimestamp } from '@/lib/utils/formatter';
import { cronToHuman } from '@/lib/utils/cron';
import { Separator } from '@/components/ui/separator';

interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  message: string;
}

interface SimulationResult {
  success: boolean;
  payments: Array<{
    from: string;
    fromAccount: {
      name: string;
      slug: string;
      balance: number;
      balanceAfter: number;
    };
    to: string[];
    toDetails: Array<{
      id: string;
      name: string;
      type: 'invoice' | 'employee' | 'contractor' | 'account';
      amount: number;
      description?: string;
      // Additional details for enhanced display
      beneficiaryId?: string;
      walletAddress?: string;
      tags?: string[];
      email?: string;
      role?: string;
    }>;
    amount: string;
    currency: string;
    action: string;
    breakdown?: {
      totalAmount: number;
      itemCount: number;
      description: string;
    };
  }>;
  conditions: Array<{
    description: string;
    passed: boolean;
    value: any;
  }>;
  collections: Array<{
    name: string;
    type: string;
    items: Array<{
      id: string;
      name: string;
      details: any;
    }>;
  }>;
  errors: string[];
  warnings: string[];
}

export function RuleTestSidebar() {
  const { isTestSidebarOpen, setIsTestSidebarOpen, ruleData } = useRuleTest();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);

  // Validate rule using the API endpoint
  const validateRule = async (rule: any) => {
    if (!rule) {
      setValidationResult({
        isValid: false,
        errors: ['No rule data provided'],
        message: 'Rule validation failed',
      });
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch('/api/rule/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleData: rule }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }

      setValidationResult(result);
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({
        isValid: false,
        errors: [
          `Failed to validate rule:
            ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        message: 'Rule validation failed',
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Validate rule when ruleData changes
  useEffect(() => {
    if (ruleData && isTestSidebarOpen) {
      validateRule(ruleData);
    } else {
      setValidationResult(null);
    }
  }, [ruleData, isTestSidebarOpen]);

  // Add validation for malformed rule data
  const isValidRuleData = (
    rule: any,
  ): rule is {
    payment: any;
    execution: any;
    conditions: any[];
    original?: string;
    memo?: string;
  } => {
    return (
      rule &&
      typeof rule === 'object' &&
      rule.payment &&
      rule.execution &&
      Array.isArray(rule.conditions)
    );
  };

  const runSimulation = async () => {
    if (!ruleData) return;

    setIsSimulating(true);
    setSimulationResult(null);

    try {
      const response = await fetch('/api/rule/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleData }),
      });

      const result = await response.json();
      setSimulationResult(result);
    } catch (error) {
      console.error('Simulation error:', error);
      setSimulationResult({
        success: false,
        payments: [],
        conditions: [],
        collections: [],
        errors: ['Failed to run simulation'],
        warnings: [],
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <AnimatePresence>
      {isTestSidebarOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsTestSidebarOpen(false)}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-3/4 bg-card border-l border-border shadow-xl z-50 overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                <div>
                  <h2 className="text-xl font-semibold">Test Rule</h2>
                  <p className="text-sm text-muted-foreground">
                    Preview rule execution
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsTestSidebarOpen(false)}
                >
                  <XIcon size={20} />
                </Button>
              </div>

              {/* Content - Two Column Layout */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Column - Rule Overview */}
                <div className="w-1/2 p-6 space-y-6 overflow-y-auto border-r border-border bg-background/50">
                  {/* Rule Overview */}
                  {ruleData && (
                    <>
                      {/* Validation Status */}
                      {isValidating && (
                        <Card className="bg-blue/10 border-blue/30">
                          <CardHeader>
                            <CardTitle className="text-blue-400 flex items-center gap-2">
                              <LoaderIcon size={16} className="animate-spin" />
                              Validating Rule
                            </CardTitle>
                            <CardDescription>
                              Checking rule structure and business logic...
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      )}

                      {!isValidating &&
                        validationResult &&
                        !validationResult.isValid && (
                          <Card className="bg-destructive/10 border-destructive/30">
                            <CardHeader>
                              <CardTitle className="text-destructive">
                                Rule Validation Failed
                              </CardTitle>
                              <CardDescription>
                                This rule has validation errors that must be
                                fixed before it can be used.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {validationResult.errors &&
                                validationResult.errors.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="text-sm font-medium text-destructive">
                                      Validation Errors:
                                    </div>
                                    <div className="space-y-1">
                                      {validationResult.errors.map(
                                        (error, idx) => (
                                          <div
                                            key={`validation-error-${error}`}
                                            className="text-sm bg-destructive/20 p-2 rounded border-l-2 border-destructive"
                                          >
                                            • {error}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              <details className="mt-4">
                                <summary className="text-sm font-medium cursor-pointer hover:text-foreground">
                                  View Rule Data
                                </summary>
                                <pre className="text-xs overflow-auto bg-muted p-2 rounded mt-2 max-h-32">
                                  {JSON.stringify(ruleData, null, 2)}
                                </pre>
                              </details>
                            </CardContent>
                          </Card>
                        )}

                      {!isValidating && validationResult?.isValid && (
                        <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50">
                          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border/30">
                            <CardTitle className="flex items-center gap-2 mb-1">
                              Rule Overview
                              <Badge
                                variant="secondary"
                                className="bg-green-500/20 text-green-400 border-green-500/30"
                              >
                                VALID
                              </Badge>
                            </CardTitle>
                            <CardDescription className="bg-muted/30 p-2 rounded border-l-2 border-purple">
                              Original:{' '}
                              {ruleData.original || 'No original text provided'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Execution Details */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 mt-4">
                                <span className="text-sm font-semibold flex items-center gap-2">
                                  {ruleData.execution.timing === 'once' && (
                                    <ClockIcon
                                      size={16}
                                      className="text-green-500"
                                    />
                                  )}
                                  {ruleData.execution.timing === 'schedule' && (
                                    <CalendarIcon
                                      size={16}
                                      className="text-green-500"
                                    />
                                  )}
                                  {ruleData.execution.timing === 'hook' && (
                                    <ZapIcon
                                      size={16}
                                      className="text-green-500"
                                    />
                                  )}
                                  Execution Type:
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="bg-green-500/20 text-green-400 border-green-500/30"
                                >
                                  {ruleData.execution.timing}
                                </Badge>
                              </div>

                              {ruleData.execution.timing === 'once' &&
                                ruleData.execution.at && (
                                  <div className="text-sm  ml-2">
                                    <strong>When:</strong>{' '}
                                    <span className="text-green-500">
                                      {formatTimestamp(ruleData.execution.at)}
                                    </span>
                                  </div>
                                )}

                              {ruleData.execution.timing === 'schedule' &&
                                ruleData.execution.cron && (
                                  <div className="text-sm text-muted-foreground ml-2">
                                    <div>
                                      <span className="font-bold">
                                        Schedule:
                                      </span>{' '}
                                      <span className="text-green-500">
                                        {cronToHuman(ruleData.execution.cron)}
                                      </span>
                                    </div>
                                    <div className="font-mono text-xs mt-1">
                                      <span className="font-bold">CRON:</span>{' '}
                                      {ruleData.execution.cron}
                                    </div>
                                  </div>
                                )}

                              {ruleData.execution.timing === 'hook' &&
                                ruleData.execution.hooks && (
                                  <div className="text-sm text-muted-foreground ml-2">
                                    <strong>Triggered by:</strong>
                                    {ruleData.execution.hooks?.map(
                                      (hook, idx) => (
                                        <div
                                          key={`${hook.type}-${hook.target}`}
                                          className="ml-2"
                                        >
                                          • {hook.type}: {hook.target}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                            </div>

                            <Separator />

                            {/* Payment Details */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold flex items-center gap-2">
                                  <CreditCardIcon
                                    size={16}
                                    className="text-emerald-500"
                                  />
                                  Payment Type:
                                </span>
                                <Badge
                                  variant={
                                    ruleData.payment.action === 'simple'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                >
                                  {ruleData.payment.action}
                                </Badge>
                              </div>

                              <div className="text-sm text-muted-foreground ml-2 space-y-2 bg-muted/20 p-3 rounded">
                                <div>
                                  <strong className="text-foreground/80">
                                    Source:
                                  </strong>{' '}
                                  <span className="uppercase font-mono bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded text-xs border border-emerald-500/30">
                                    {ruleData.payment.source}
                                  </span>
                                </div>
                                <div>
                                  <strong className="text-foreground/80">
                                    Amount:
                                  </strong>{' '}
                                  <span className="font-mono">
                                    {formatAmount(ruleData.payment.amount)}{' '}
                                    {ruleData.payment.currency}
                                  </span>
                                </div>

                                {/* Beneficiary Display - Universal for all payment types */}
                                <div className="space-y-2">
                                  <strong className="text-foreground/80 flex items-center gap-2">
                                    <UsersIcon
                                      size={14}
                                      className="text-emerald-500"
                                    />
                                    {ruleData.payment.action === 'split'
                                      ? 'Split Distribution:'
                                      : ruleData.payment.action === 'batch'
                                        ? 'Batch Filtering:'
                                        : 'Beneficiaries:'}
                                  </strong>

                                  {/* Special handling for split payments with percentages */}
                                  {ruleData.payment.action === 'split' &&
                                  ruleData.payment.percentages &&
                                  ruleData.payment.beneficiary ? (
                                    <div className="ml-2 space-y-2 mt-2 bg-violet-500/10 p-2 rounded border border-violet-500/20">
                                      {ruleData.payment.beneficiary.map(
                                        (beneficiary, idx) => (
                                          <div
                                            key={`beneficiary-${beneficiary}`}
                                            className="flex justify-between items-center p-2 bg-background/60 rounded border border-violet-500/30"
                                          >
                                            <span className="truncate uppercase font-mono text-xs">
                                              {beneficiary}
                                            </span>
                                            <Badge
                                              variant="secondary"
                                              className="bg-violet-500/20 text-violet-300 border-violet-500/30"
                                            >
                                              {ruleData.payment.percentages?.[
                                                idx
                                              ] ?? 0}
                                              %
                                            </Badge>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  ) : ruleData.payment.action === 'batch' &&
                                    ruleData.payment.tags ? (
                                    /* Special handling for batch payments with tags */
                                    <div className="ml-2 space-y-2 mt-2">
                                      <div className="bg-blue-500/10 p-2 rounded border border-blue-500/20">
                                        <div className="text-xs text-blue-300 mb-2">
                                          <strong>Filter by tags:</strong>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                          {ruleData.payment.tags?.map(
                                            (tag, idx) => (
                                              <Badge
                                                key={`tag-${tag}`}
                                                variant="secondary"
                                                className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs"
                                              >
                                                {tag}
                                              </Badge>
                                            ),
                                          ) || (
                                            <span className="text-muted-foreground text-xs">
                                              No tags
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="bg-muted/10 p-2 rounded border border-muted/20">
                                        <div className="text-xs text-muted-foreground mb-2">
                                          <strong>From collections:</strong>
                                        </div>
                                        <div className="space-y-1">
                                          {ruleData.payment.beneficiary?.map(
                                            (beneficiary, idx) => (
                                              <div
                                                key={`beneficiary-${beneficiary}`}
                                                className="flex items-center gap-2"
                                              >
                                                <span className="uppercase font-mono text-xs bg-muted/20 text-muted-foreground px-2 py-1 rounded border border-muted/30">
                                                  {beneficiary}
                                                </span>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Standard beneficiary list for simple, calculation, and leftover */
                                    <div className="ml-2 space-y-1 p-2 rounded border bg-emerald-500/10 border-emerald-500/20">
                                      {ruleData.payment.beneficiary?.map(
                                        (beneficiary, idx) => (
                                          <div
                                            key={`beneficiary-${beneficiary}`}
                                            className="flex items-center gap-2"
                                          >
                                            <span className="uppercase font-mono text-xs px-2 py-1 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                                              {beneficiary}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Conditions Details */}
                            {ruleData.conditions.length > 0 && (
                              <>
                                <Separator />
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold flex items-center gap-2">
                                      <CheckCircleIcon
                                        size={16}
                                        className="text-cyan-500"
                                      />
                                      Conditions:
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                    >
                                      {ruleData.conditions?.length || 0}{' '}
                                      condition(s)
                                    </Badge>
                                  </div>

                                  <div className="ml-2 space-y-3">
                                    {ruleData.conditions?.map(
                                      (condition, idx) => (
                                        <div
                                          key={`condition-${condition.source}-${condition.field}-${condition.operator}-${idx}`}
                                          className="border border-border bg-muted/40 rounded-md p-3 space-y-1"
                                        >
                                          <div className="text-sm text-cyan-400">
                                            <strong>
                                              {condition.when === 'after'
                                                ? 'Post-execution:'
                                                : 'Pre-execution:'}
                                            </strong>
                                          </div>
                                          <div className="text-sm font-medium text-cyan-400">
                                            {condition.description ||
                                              `${condition.source}.${condition.field} ${condition.operator} ${condition.value}`}
                                          </div>
                                          <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 p-2 rounded">
                                            <div>
                                              <strong className="text-foreground/80">
                                                Source:
                                              </strong>{' '}
                                              <span className="font-mono">
                                                {condition.source}
                                              </span>
                                            </div>
                                            <div>
                                              <strong className="text-foreground/80">
                                                Field:
                                              </strong>{' '}
                                              <span className="font-mono">
                                                {condition.field}
                                              </span>
                                            </div>
                                            <div>
                                              <strong className="text-foreground/80">
                                                Condition:
                                              </strong>{' '}
                                              <span className="font-mono">
                                                {condition.operator}{' '}
                                                {JSON.stringify(
                                                  condition.value,
                                                )}
                                              </span>
                                            </div>
                                            {condition.logic && (
                                              <div>
                                                <strong className="text-foreground/80">
                                                  Logic:
                                                </strong>{' '}
                                                <span className="font-mono">
                                                  {condition.logic}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Memo */}
                            {ruleData.memo && (
                              <>
                                <Separator />
                                <div className="space-y-2">
                                  <span className="text-sm font-semibold flex items-center gap-2">
                                    <FileTextIcon
                                      size={16}
                                      className="text-muted-foreground"
                                    />
                                    Memo:
                                  </span>
                                  <div className="text-sm text-muted-foreground ml-2 italic bg-muted/20 p-3 rounded border-l-2 border-muted/30">
                                    &ldquo;{ruleData.memo}&rdquo;
                                  </div>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}

                  {/* Simulation Controls */}
                  <div className="flex gap-3">
                    <Button
                      onClick={runSimulation}
                      disabled={
                        isSimulating ||
                        isValidating ||
                        !validationResult?.isValid
                      }
                      className="flex-1"
                      size="lg"
                    >
                      {isSimulating ? (
                        <>
                          <LoaderIcon size={16} className="animate-spin mr-2" />
                          Running Simulation...
                        </>
                      ) : (
                        <>
                          <PlayIcon size={16} className="mr-2" />
                          Run Test Simulation
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Validation message when simulation disabled */}
                  {(isValidating || !validationResult?.isValid) && (
                    <div className="text-sm text-muted-foreground text-center p-3 bg-muted/20 rounded border">
                      {isValidating
                        ? 'Validating rule before simulation...'
                        : 'Rule must pass validation before simulation can run'}
                    </div>
                  )}
                </div>

                {/* Right Column - Simulation Results */}
                <div className="w-1/2 p-6 overflow-y-auto bg-muted/20">
                  <div className="space-y-4">
                    {/* Simulation Results Header */}
                    <div className="flex items-center gap-2 mb-6">
                      <h3 className="text-xl font-medium">
                        Simulation Results
                      </h3>
                      {simulationResult && (
                        <>
                          <Button
                            onClick={() => setSimulationResult(null)}
                            variant="outline"
                            size="sm"
                            className="px-3"
                          >
                            <RotateCcwIcon size={16} />
                          </Button>
                          <Badge
                            variant={
                              simulationResult.success
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {simulationResult.success ? 'SUCCESS' : 'FAILED'}
                          </Badge>
                        </>
                      )}
                    </div>

                    {/* Show placeholder when no results */}
                    {!simulationResult && (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <div className="text-center p-8 rounded-lg bg-muted/30 border border-border">
                          <PlayIcon
                            size={48}
                            className="mx-auto mb-4 opacity-60"
                          />
                          <p className="text-sm">
                            Run a simulation to see results here
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Simulation Results Content */}
                    {simulationResult && (
                      <div className="space-y-4">
                        {/* Errors */}
                        {simulationResult.errors.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-white">
                                Errors
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {simulationResult.errors.map((error, idx) => (
                                  <li
                                    key={`error-${error}`}
                                    className="font-medium text-destructive bg-white p-2 rounded border-l-2 border-destructive"
                                  >
                                    • {error}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}

                        {/* Warnings */}
                        {simulationResult.warnings.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-yellow-600">
                                Warnings
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {simulationResult.warnings.map(
                                  (warning, idx) => (
                                    <li
                                      key={`warning-${warning}`}
                                      className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 p-2 rounded border-l-2 border-yellow-500"
                                    >
                                      • {warning}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </CardContent>
                          </Card>
                        )}

                        {/* Payments */}
                        {simulationResult.payments.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Payment Preview</CardTitle>
                              <CardDescription>
                                The following payments would be executed:
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {simulationResult.payments.map((payment, idx) => (
                                <div
                                  key={`payment-${payment.from}-${payment.to.join('-')}`}
                                  className="border border-border bg-background/60 rounded-lg overflow-hidden"
                                >
                                  {/* Source Account Info */}
                                  {payment.fromAccount && (
                                    <div className="bg-muted-500/5 border-b p-5">
                                      <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-lg">
                                          <strong className="text-foreground/80">
                                            From:
                                          </strong>
                                          <span className="font-mono bg-emerald-500/20 px-2 py-1 rounded text-xs border border-emerald-500/30 text-emerald-300 uppercase">
                                            {payment.fromAccount.slug}
                                          </span>
                                        </div>
                                        <div className="text-base">
                                          {/* Balance:{' '} */}
                                          <p className="font-mono text-black dark:text-muted-foreground">
                                            Previous BALANCE:{' '}
                                            {payment.fromAccount.balance.toLocaleString()}{' '}
                                            {payment.currency}
                                          </p>{' '}
                                          {/* →{' '} */}
                                          <p className="text-xl font-mono font-semibold text-black dark:text-muted-foreground">
                                            New BALANCE:{' '}
                                            {payment.fromAccount.balanceAfter.toLocaleString()}{' '}
                                            {payment.currency}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Payment Header */}
                                  <div className="p-3 bg-muted/10 border-b flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {payment.breakdown && (
                                        <span className="text-xs text-muted-foreground">
                                          {payment.breakdown.description}
                                        </span>
                                      )}
                                      <Badge
                                        variant="outline"
                                        className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                      >
                                        {payment.action}
                                      </Badge>
                                    </div>
                                    <span className="font-mono text-sm font-semibold">
                                      TOTAL: {payment.amount} {payment.currency}
                                    </span>
                                  </div>

                                  {/* Individual Payment Items */}
                                  {payment.toDetails &&
                                    payment.toDetails.length > 0 && (
                                      <div className="p-5 space-y-2">
                                        <strong className="text-foreground/80 text-xs block mb-2">
                                          TO: ({payment.toDetails.length}{' '}
                                          recipients)
                                        </strong>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                          {payment.toDetails.map(
                                            (detail, detailIdx) => (
                                              <div
                                                key={`detail-${detail.id}`}
                                                className="flex items-center justify-between p-3 bg-muted/20 rounded border border-muted"
                                              >
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium text-xs truncate">
                                                      {detail.name}
                                                    </span>
                                                    <Badge
                                                      variant="secondary"
                                                      className={`text-xs ${
                                                        detail.type ===
                                                        'employee'
                                                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                                          : detail.type ===
                                                              'contractor'
                                                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                                                            : detail.type ===
                                                                'invoice'
                                                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                                      }`}
                                                    >
                                                      {detail.type}
                                                    </Badge>
                                                  </div>
                                                  {detail.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                                      {detail.description}
                                                    </p>
                                                  )}

                                                  {/* Additional details for invoices and beneficiaries */}
                                                  {(detail.walletAddress ||
                                                    detail.email ||
                                                    detail.role ||
                                                    detail.tags) && (
                                                    <div className="mt-2 space-y-1 text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                                                      {detail.beneficiaryId && (
                                                        <div>
                                                          <strong>ID:</strong>{' '}
                                                          <span className="font-mono text-xs">
                                                            {
                                                              detail.beneficiaryId
                                                            }
                                                          </span>
                                                        </div>
                                                      )}
                                                      {detail.email && (
                                                        <div>
                                                          <strong>
                                                            Email:
                                                          </strong>{' '}
                                                          {detail.email}
                                                        </div>
                                                      )}
                                                      {detail.role && (
                                                        <div>
                                                          <strong>Role:</strong>{' '}
                                                          {detail.role}
                                                        </div>
                                                      )}
                                                      {detail.walletAddress && (
                                                        <div>
                                                          <strong>
                                                            Wallet:
                                                          </strong>{' '}
                                                          <span className="font-mono text-xs">
                                                            {
                                                              detail.walletAddress
                                                            }
                                                          </span>
                                                        </div>
                                                      )}
                                                      {detail.tags &&
                                                        Array.isArray(
                                                          detail.tags,
                                                        ) &&
                                                        detail.tags.length >
                                                          0 && (
                                                          <div>
                                                            <strong>
                                                              Tags:
                                                            </strong>{' '}
                                                            {detail.tags.join(
                                                              ', ',
                                                            )}
                                                          </div>
                                                        )}
                                                    </div>
                                                  )}
                                                </div>
                                                <span className="font-mono text-xs font-semibold ml-2">
                                                  {detail.amount.toLocaleString()}{' '}
                                                  {payment.currency}
                                                </span>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}

                        {/* Collections */}
                        {/* {simulationResult.collections.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Collections Used</CardTitle>
                              <CardDescription>
                                Items found for collections referenced in this
                                rule
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {simulationResult.collections.map(
                                (collection, idx) => (
                                  <div
                                    key={`collection-${collection.name}`}
                                    className="space-y-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-cyan-400">
                                        {collection.type}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-cyan-400"
                                      >
                                        {collection.items.length} items
                                      </Badge>
                                    </div>
                                    <div className="ml-4 space-y-2 max-h-40 overflow-y-auto">
                                      {collection.items.map((item, itemIdx) => (
                                        <div
                                          key={`item-${item.id}`}
                                          className="p-2 border border-border bg-background/60 rounded text-sm"
                                        >
                                          <div className="font-medium">
                                            {item.name}
                                          </div>
                                          {item.details && (
                                            <div className="text-xs text-muted-foreground mt-2 space-y-1 bg-muted/30 p-2 rounded">
                                              {Object.entries(item.details).map(
                                                ([key, value]) => (
                                                  <div
                                                    key={key}
                                                    className="flex gap-2"
                                                  >
                                                    <strong className="text-foreground/80 min-w-fit">
                                                      {key}:
                                                    </strong>
                                                    <span className="font-mono">
                                                      {String(value)}
                                                    </span>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ),
                              )}
                            </CardContent>
                          </Card>
                        )} */}

                        {/* Conditions */}
                        {simulationResult.conditions.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Condition Checks</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {simulationResult.conditions.map(
                                (condition, idx) => (
                                  <div
                                    key={`condition-${condition.description}`}
                                    className="p-3 border border-border bg-background/60 rounded space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">
                                        {condition.description}
                                      </span>
                                      <Badge
                                        variant={
                                          condition.passed
                                            ? 'secondary'
                                            : 'destructive'
                                        }
                                        className={
                                          condition.passed
                                            ? 'text-green-500'
                                            : 'text-white'
                                        }
                                      >
                                        {condition.passed ? 'PASS' : 'FAIL'}
                                      </Badge>
                                    </div>
                                    {condition.value && (
                                      <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                                        <strong className="text-foreground/80">
                                          Result:
                                        </strong>{' '}
                                        <span className="font-mono">
                                          {String(condition.value)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ),
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
