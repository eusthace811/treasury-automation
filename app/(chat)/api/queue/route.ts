import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import type { TreasuryRuleData } from '@/lib/treasury/schema';

async function handler(request: NextRequest) {
  try {
    console.log('🎯 Payment execution webhook received');

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
        error: 'Missing chatId or ruleData'
      });
    }

    console.log('📋 Processing payment execution for chat:', chatId);
    console.log('💰 Rule data:', JSON.stringify(ruleData, null, 2));

    // Simulate payment processing
    console.log('🎉 Payment execution simulated successfully');

    return NextResponse.json({
      success: true,
      chatId,
      message: `Payment execution completed for rule: ${ruleData.original}`
    });

  } catch (error) {
    console.error('❌ Payment execution error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Payment execution error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


// Wrap with QStash signature verification
export const POST = verifySignatureAppRouter(handler);