import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import type { TreasuryRuleData, EnhancedAuditTrail } from '@/lib/treasury/schema';

// Enhanced payment processing components
import { paymentResolver } from '@/lib/treasury/payment-resolver';
import { batchPolicyValidator } from '@/lib/treasury/batch-policy-validator';
import { batchPaymentProcessor } from '@/lib/treasury/batch-payment-processor';

// Enhanced payment processing components now handle their own interfaces

async function handler(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🎯 Enhanced payment execution webhook received');

    // Parse the request body
    const body = await request.json();
    const { chatId, ruleData } = body as {
      chatId: string;
      ruleData: TreasuryRuleData;
    };

    // Validate required fields
    if (!chatId || !ruleData) {
      console.error('❌ Missing required fields:', { chatId: !!chatId, ruleData: !!ruleData });
      return NextResponse.json({
        success: false,
        error: 'Missing chatId or ruleData',
        audit: createEnhancedFailureAudit(chatId || 'unknown', startTime, 'INVALID_REQUEST')
      });
    }

    console.log('📋 Processing enhanced payment execution for chat:', chatId);
    console.log('💰 Rule data:', JSON.stringify(ruleData, null, 2));

    const executionId = `exec_${chatId}_${startTime}`;

    // Step 1: Resolve payments from rule data (collections, amounts, etc.)
    console.log('🔍 Step 1: Payment resolution');
    const paymentResolution = await paymentResolver.resolvePayments(ruleData);
    
    if (!paymentResolution.success) {
      console.log('❌ Payment resolution failed:', paymentResolution.message);
      return NextResponse.json({
        success: false,
        chatId,
        execution: createEnhancedAudit(
          executionId, chatId, startTime, paymentResolution, undefined, undefined, 'RESOLUTION_FAILED'
        )
      });
    }

    console.log(`💡 Resolved ${paymentResolution.paymentItems.length} individual payments totaling ${paymentResolution.totalAmount} ${ruleData.payment.currency}`);

    // Step 2: Batch policy validation for all individual payments
    console.log('🛡️ Step 2: Batch policy validation');
    console.log(`🔍 Validating ${paymentResolution.paymentItems.length} individual payments through 4-tier policy framework`);
    
    const policyValidation = await batchPolicyValidator.validatePaymentBatch(
      chatId,
      paymentResolution.paymentItems,
      ruleData.payment.source
    );
    
    // Enhanced policy validation logging
    console.log(`📊 Policy validation results:`);
    console.log(`  • Risk assessment: ${policyValidation.auditTrail.batchAnalysis.riskAssessment}`);
    console.log(`  • Account impact: ${policyValidation.auditTrail.batchAnalysis.accountImpact?.postBatchBalance} USDC post-batch`);
    console.log(`  • Daily spending impact: ${policyValidation.auditTrail.batchAnalysis.dailySpendingImpact?.totalDailySpending} USDC total`);
    
    if (!policyValidation.success) {
      console.log(`❌ Policy validation failed: ${policyValidation.failedItems.length} violations`);
      console.log(`🔍 Violation breakdown:`);
      const violationsByType = policyValidation.policyViolations.reduce((acc, v) => {
        acc[v.policyType] = (acc[v.policyType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      for (const [type, count] of Object.entries(violationsByType)) {
        console.log(`  • ${type}: ${count} violations`);
      }
      
      return NextResponse.json({
        success: false,
        chatId,
        execution: createEnhancedAudit(
          executionId, chatId, startTime, paymentResolution, policyValidation, undefined, 'POLICY_VIOLATION'
        )
      });
    }

    console.log(`✅ Policy validation passed: ${policyValidation.successfulItems.length}/${policyValidation.summary.totalItems} payments approved`);

    // Step 3: Execute batch payment processing
    console.log('💳 Step 3: Batch payment execution');
    const paymentExecution = await batchPaymentProcessor.executeBatch(
      chatId,
      policyValidation.successfulItems,
      ruleData.payment.source
    );
    
    if (!paymentExecution.success) {
      console.log(`❌ Payment execution failed: ${paymentExecution.failedPayments.length} failures`);
      return NextResponse.json({
        success: false,
        chatId,
        execution: createEnhancedAudit(
          executionId, chatId, startTime, paymentResolution, policyValidation, paymentExecution, 'EXECUTION_FAILED'
        )
      });
    }

    console.log(`🎉 Payment execution completed: ${paymentExecution.successfulPayments.length} payments processed, ${paymentExecution.totalAmount} ${ruleData.payment.currency} transferred`);

    // Step 4: Generate comprehensive success audit trail
    const successAudit = createEnhancedAudit(
      executionId, chatId, startTime, paymentResolution, policyValidation, paymentExecution, 'SUCCESS'
    );

    return NextResponse.json({
      success: true,
      chatId,
      execution: successAudit,
      message: `Enhanced payment execution completed: ${paymentExecution.successfulPayments.length} payments processed`
    });

  } catch (error) {
    console.error('❌ Enhanced payment execution system error:', error);
    
    // Always return 200 to prevent QStash retries, but with failure audit
    return NextResponse.json({
      success: false,
      error: 'Enhanced payment execution system error',
      details: error instanceof Error ? error.message : 'Unknown error',
      audit: createEnhancedFailureAudit('unknown', startTime, 'EXECUTION_FAILED')
    });
  }
}

function createEnhancedAudit(
  executionId: string,
  chatId: string,
  startTime: number,
  paymentResolution: any,
  policyValidation?: any,
  paymentExecution?: any,
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'POLICY_VIOLATION' | 'RESOLUTION_FAILED' | 'EXECUTION_FAILED' | 'INVALID_REQUEST' = 'SUCCESS'
): EnhancedAuditTrail {
  return {
    execution_id: executionId,
    chat_id: chatId,
    timestamp: Date.now(),
    execution_date: new Date().toISOString(),
    payment_resolution: paymentResolution,
    individual_policy_results: policyValidation?.individualResults || [],
    batch_payment_result: paymentExecution || {
      success: false,
      totalAmount: 0,
      itemCount: 0,
      successfulPayments: [],
      failedPayments: [],
      policyViolations: [],
      executionTimeMs: 0,
      auditTrail: { resolutionSteps: [], policyChecks: [], executionSteps: [] }
    },
    total_execution_time_ms: Date.now() - startTime,
    status,
    summary: {
      totalRequested: paymentResolution?.paymentItems?.length || 0,
      totalProcessed: paymentExecution?.successfulPayments?.length || 0,
      successfulPayments: paymentExecution?.successfulPayments?.length || 0,
      failedPayments: paymentExecution?.failedPayments?.length || 0,
      policyViolations: policyValidation?.policyViolations?.length || 0,
    },
  };
}

function createEnhancedFailureAudit(
  chatId: string,
  startTime: number,
  status: 'RESOLUTION_FAILED' | 'POLICY_VIOLATION' | 'EXECUTION_FAILED' | 'INVALID_REQUEST'
): EnhancedAuditTrail {
  return {
    execution_id: `fail_${chatId}_${startTime}`,
    chat_id: chatId,
    timestamp: Date.now(),
    execution_date: new Date().toISOString(),
    payment_resolution: {
      success: false,
      message: 'Failed before resolution',
      paymentItems: [],
      totalAmount: 0,
      errors: ['System failure'],
      resolutionSteps: [],
      details: {
        originalRule: {} as any,
        amountCalculation: { method: 'unknown', totalCalculated: 0, breakdown: {} }
      }
    },
    individual_policy_results: [],
    batch_payment_result: {
      success: false,
      totalAmount: 0,
      itemCount: 0,
      successfulPayments: [],
      failedPayments: [],
      policyViolations: [],
      executionTimeMs: 0,
      auditTrail: { resolutionSteps: [], policyChecks: [], executionSteps: [] }
    },
    total_execution_time_ms: Date.now() - startTime,
    status,
    summary: {
      totalRequested: 0,
      totalProcessed: 0,
      successfulPayments: 0,
      failedPayments: 0,
      policyViolations: 0,
    },
  };
}

// Wrap with QStash signature verification
export const POST = verifySignatureAppRouter(handler);