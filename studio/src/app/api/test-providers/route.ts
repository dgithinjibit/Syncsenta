import { NextRequest, NextResponse } from 'next/server';
import { multiAIClient } from '@/lib/multi-ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Testing all AI providers...');
    
    const testResults = await multiAIClient.testAllProviders();
    const providerStatus = multiAIClient.getProviderStatus();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      providerStatus,
      testResults,
      summary: {
        totalProviders: providerStatus.totalProviders,
        workingProviders: testResults.working.length,
        failedProviders: testResults.failed.length,
        healthPercentage: Math.round((testResults.working.length / providerStatus.totalProviders) * 100)
      }
    });
  } catch (error) {
    console.error('Provider test error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message = 'Hello, test message for SyncSenta' } = await req.json();
    
    console.log('🧪 Testing AI response generation...');
    
    const aiResponse = await multiAIClient.generateMwalimuResponse(
      message,
      'Grade 4',
      'Mathematics'
    );
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      testMessage: message,
      aiResponse,
      providerStatus: multiAIClient.getProviderStatus()
    });
  } catch (error) {
    console.error('AI response test error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      providerStatus: multiAIClient.getProviderStatus()
    }, { status: 500 });
  }
}