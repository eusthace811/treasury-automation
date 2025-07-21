'use client';

import { useRuleTest } from '@/contexts/rule-test-context';
import { Button } from '@/components/ui/button';
import { XIcon, PlayIcon, LoaderIcon, RotateCcwIcon } from 'lucide-react';
import { useState } from 'react';
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

interface SimulationResult {
  success: boolean;
  payments: Array<{
    from: string;
    to: string[];
    amount: string;
    currency: string;
    action: string;
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
                    <Card>
                      <CardHeader>
                        <CardTitle>Rule Overview</CardTitle>
                        <CardDescription>{ruleData.original}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Execution Details */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              Execution Type:
                            </span>
                            <Badge variant="outline">
                              {ruleData.execution.timing}
                            </Badge>
                          </div>

                          {ruleData.execution.timing === 'once' &&
                            ruleData.execution.at && (
                              <div className="text-sm text-muted-foreground ml-2">
                                <strong>When:</strong>{' '}
                                {formatTimestamp(ruleData.execution.at)}
                              </div>
                            )}

                          {ruleData.execution.timing === 'schedule' &&
                            ruleData.execution.cron && (
                              <div className="text-sm text-muted-foreground ml-2">
                                <div>
                                  <strong>Schedule:</strong>{' '}
                                  {cronToHuman(ruleData.execution.cron)}
                                </div>
                                <div className="font-mono text-xs mt-1">
                                  Cron: {ruleData.execution.cron}
                                </div>
                              </div>
                            )}

                          {ruleData.execution.timing === 'hook' &&
                            ruleData.execution.hooks && (
                              <div className="text-sm text-muted-foreground ml-2">
                                <strong>Triggered by:</strong>
                                {ruleData.execution.hooks.map((hook, idx) => (
                                  <div
                                    key={`${hook.type}-${hook.target}`}
                                    className="ml-2"
                                  >
                                    • {hook.type}: {hook.target}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>

                        <Separator />

                        {/* Payment Details */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              Payment Type:
                            </span>
                            <Badge variant="outline">
                              {ruleData.payment.action}
                            </Badge>
                          </div>

                          <div className="text-sm text-muted-foreground ml-2 space-y-2 bg-muted/20 p-3 rounded">
                            <div>
                              <strong className="text-foreground/80">
                                Source:
                              </strong>{' '}
                              <span className="uppercase font-mono bg-secondary/50 px-2 py-1 rounded text-xs">
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

                            {ruleData.payment.action === 'split' &&
                              ruleData.payment.percentages && (
                                <div className="mt-2">
                                  <strong>Split Distribution:</strong>
                                  <div className="ml-2 space-y-2 mt-2 bg-muted/20 p-2 rounded">
                                    {ruleData.payment.beneficiary.map(
                                      (beneficiary, idx) => (
                                        <div
                                          key={`beneficiary-${beneficiary}`}
                                          className="flex justify-between items-center p-2 bg-background/60 rounded border border-border"
                                        >
                                          <span className="truncate uppercase font-mono text-xs">
                                            {beneficiary}
                                          </span>
                                          <Badge variant="secondary">
                                            {ruleData.payment.percentages?.[
                                              idx
                                            ] ?? 0}
                                            %
                                          </Badge>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}

                            {ruleData.payment.action === 'simple' && (
                              <div className="space-y-2">
                                <strong className="text-foreground/80">
                                  Beneficiary:
                                </strong>
                                <div className="ml-2 space-y-1 bg-muted/20 p-2 rounded">
                                  {ruleData.payment.beneficiary.map(
                                    (beneficiary, idx) => (
                                      <div
                                        key={`beneficiary-${beneficiary}`}
                                        className="flex items-center gap-2"
                                      >
                                        <span className="w-2 h-2 bg-primary/60 rounded-full" />
                                        <span className="uppercase font-mono text-xs bg-secondary/50 px-2 py-1 rounded">
                                          {beneficiary}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Conditions Details */}
                        {ruleData.conditions.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">
                                  Conditions:
                                </span>
                                <Badge variant="outline">
                                  {ruleData.conditions.length} condition(s)
                                </Badge>
                              </div>

                              <div className="ml-2 space-y-3">
                                {ruleData.conditions.map((condition, idx) => (
                                  <div
                                    key={`condition-${condition.source}-${condition.field}-${condition.operator}-${idx}`}
                                    className="border border-border bg-muted/40 rounded-md p-3 space-y-1"
                                  >
                                    <div className="text-sm">
                                      <strong>
                                        {condition.when === 'after'
                                          ? 'Post-execution:'
                                          : 'Pre-execution:'}
                                      </strong>
                                    </div>
                                    <div className="text-sm font-medium">
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
                                          {JSON.stringify(condition.value)}
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
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Memo */}
                        {ruleData.memo && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <span className="text-sm font-semibold">
                                Memo:
                              </span>
                              <div className="text-sm text-muted-foreground ml-2 italic bg-muted/30 p-3 rounded border-l-2 border-primary/30">
                                &ldquo;{ruleData.memo}&rdquo;
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Simulation Controls */}
                  <div className="flex gap-3">
                    <Button
                      onClick={runSimulation}
                      disabled={isSimulating}
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
                </div>

                {/* Right Column - Simulation Results */}
                <div className="w-1/2 p-6 overflow-y-auto bg-muted/20">
                  <div className="space-y-4">
                    {/* Simulation Results Header */}
                    <div className="flex items-center gap-2 mb-6">
                      <h3 className="text-lg font-medium">
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
                            {simulationResult.success ? 'Success' : 'Failed'}
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
                              <CardTitle className="text-destructive">
                                Errors
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {simulationResult.errors.map((error, idx) => (
                                  <li
                                    key={`error-${error}`}
                                    className="text-sm text-destructive bg-destructive/10 p-2 rounded border-l-2 border-destructive"
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

                        {/* Collections */}
                        {simulationResult.collections.length > 0 && (
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
                                      <span className="font-medium">
                                        {collection.type}
                                      </span>
                                      <Badge variant="outline">
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
                        )}

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
                                            ? 'default'
                                            : 'destructive'
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

                        {/* Payments */}
                        {simulationResult.payments.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Payment Preview</CardTitle>
                              <CardDescription>
                                The following payments would be executed:
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {simulationResult.payments.map((payment, idx) => (
                                <div
                                  key={`payment-${payment.from}-${payment.to.join('-')}-${payment.currency}`}
                                  className="p-3 border border-border bg-background/60 rounded-lg space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <Badge variant="outline">
                                      {payment.action}
                                    </Badge>
                                    <span className="font-mono text-sm">
                                      {payment.amount} {payment.currency}
                                    </span>
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <div className="flex items-center gap-2">
                                      <strong className="text-foreground/80 text-xs">
                                        From:
                                      </strong>
                                      <span className="font-mono bg-secondary/50 px-2 py-1 rounded text-xs">
                                        {payment.from}
                                      </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <strong className="text-foreground/80 text-xs mt-1">
                                        To:
                                      </strong>
                                      <div className="flex flex-wrap gap-1">
                                        {payment.to.map((recipient, idx) => (
                                          <span
                                            key={`recipient-${recipient}`}
                                            className="font-mono bg-secondary/50 px-2 py-1 rounded text-xs"
                                          >
                                            {recipient}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
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
