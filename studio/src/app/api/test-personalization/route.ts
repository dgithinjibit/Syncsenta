import { NextRequest, NextResponse } from 'next/server';
import { personalizedLearning } from '@/lib/personalized-learning';
import { multiAIClient } from '@/lib/multi-ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'user1';
    const action = searchParams.get('action') || 'profile';

    switch (action) {
      case 'profile':
        const profile = await personalizedLearning.getStudentProfile(userId);
        return NextResponse.json({
          success: true,
          profile,
          message: `Profile for ${profile.name} (${profile.id})`
        });

      case 'progress':
        const subject = searchParams.get('subject') || 'Mathematics';
        const progress = await personalizedLearning.getLearningProgress(userId, subject);
        return NextResponse.json({
          success: true,
          progress,
          subject,
          message: `Learning progress in ${subject}`
        });

      case 'providers':
        const providerStatus = multiAIClient.getProviderStatus();
        const testResults = await multiAIClient.testAllProviders();
        return NextResponse.json({
          success: true,
          providerStatus,
          testResults,
          message: 'Provider status and test results'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: profile, progress, or providers'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Test personalization error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId = 'user1', ...data } = body;

    switch (action) {
      case 'updateProfile':
        await personalizedLearning.updateProfile(userId, data);
        const updatedProfile = await personalizedLearning.getStudentProfile(userId);
        return NextResponse.json({
          success: true,
          profile: updatedProfile,
          message: 'Profile updated successfully'
        });

      case 'startSession':
        const { subject = 'Mathematics', topic = 'General' } = data;
        const session = await personalizedLearning.startSession(userId, subject, topic);
        return NextResponse.json({
          success: true,
          session,
          message: 'Learning session started'
        });

      case 'testPersonalizedPrompt':
        const { subject: promptSubject = 'Mathematics', message: promptMessage = 'Hello, I want to learn about fractions' } = data;
        const prompt = await personalizedLearning.generatePersonalizedPrompt(userId, promptSubject, promptMessage);
        return NextResponse.json({
          success: true,
          prompt,
          message: 'Personalized prompt generated'
        });

      case 'simulateConversation':
        // Simulate a full conversation to test personalization
        const profile = await personalizedLearning.getStudentProfile(userId);
        const testSubject = data.subject || 'Mathematics';
        const testMessage = data.message || 'I want to learn about fractions';

        // Generate personalized prompt
        const personalizedPrompt = await personalizedLearning.generatePersonalizedPrompt(
          userId, 
          testSubject, 
          testMessage
        );

        // Get AI response
        const messages = [
          { role: 'system' as const, content: personalizedPrompt },
          { role: 'user' as const, content: testMessage }
        ];

        const aiResponse = await multiAIClient.generateResponse(messages, {
          temperature: 0.3,
          maxTokens: 500,
          preferredProvider: 'groq'
        });

        // Start session and record interaction
        const newSession = await personalizedLearning.startSession(userId, testSubject, 'Fractions');
        
        await personalizedLearning.addInteraction(userId, newSession.id, {
          userMessage: testMessage,
          aiResponse: aiResponse.content,
          messageType: 'question',
          topicCovered: testSubject,
          difficultyLevel: 5,
          studentUnderstood: null,
          responseTime: 3
        });

        return NextResponse.json({
          success: true,
          conversation: {
            profile,
            userMessage: testMessage,
            aiResponse: aiResponse.content,
            session: newSession,
            provider: aiResponse.provider,
            model: aiResponse.model
          },
          message: 'Conversation simulated successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: updateProfile, startSession, testPersonalizedPrompt, or simulateConversation'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Test personalization POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}