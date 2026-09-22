import { NextRequest, NextResponse } from 'next/server';
import { CBCCurriculumAgent } from '@/ai/flows/cbc-curriculum-agent';
import { OrchestratorAgent } from '@/ai/flows/orchestrator-agent';
import { AssessmentAgent } from '@/ai/flows/assessment-agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { agent, action, ...params } = await req.json();

    switch (agent) {
      case 'cbc-curriculum':
        return await handleCBCAgent(action, params);
      
      case 'orchestrator':
        return await handleOrchestratorAgent(action, params);
      
      case 'assessment':
        return await handleAssessmentAgent(action, params);
      
      default:
        return NextResponse.json({ 
          error: 'Invalid agent. Available: cbc-curriculum, orchestrator, assessment' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function handleCBCAgent(action: string, params: any) {
  const agent = new CBCCurriculumAgent();
  
  switch (action) {
    case 'query':
      const response = await agent.query(params.query, {
        grade: params.grade || 'g4',
        subject: params.subject || 'Mathematics',
        language: params.language || 'english'
      });
      return NextResponse.json({ success: true, data: response });
    
    case 'validate':
      const validation = await agent.validateCurriculumAlignment(params.content, {
        grade: params.grade || 'g4',
        subject: params.subject || 'Mathematics'
      });
      return NextResponse.json({ success: true, data: validation });
    
    case 'competencies':
      const competencies = await agent.getCompetencies(
        params.grade || 'g4',
        params.subject || 'Mathematics',
        params.topic || 'fractions'
      );
      return NextResponse.json({ success: true, data: competencies });
    
    default:
      return NextResponse.json({ 
        error: 'Invalid action. Available: query, validate, competencies' 
      }, { status: 400 });
  }
}

async function handleOrchestratorAgent(action: string, params: any) {
  const agent = new OrchestratorAgent();
  
  switch (action) {
    case 'process':
      const response = await agent.processRequest({
        message: params.message,
        context: {
          userId: params.userId || 'user1',
          grade: params.grade,
          subject: params.subject,
          role: params.role || 'student',
          type: params.type,
          priority: params.priority
        }
      });
      return NextResponse.json({ success: true, data: response });
    
    default:
      return NextResponse.json({ 
        error: 'Invalid action. Available: process' 
      }, { status: 400 });
  }
}

async function handleAssessmentAgent(action: string, params: any) {
  const agent = new AssessmentAgent();
  
  switch (action) {
    case 'generateQuiz':
      const quiz = await agent.generateQuiz({
        subject: params.subject || 'Mathematics',
        grade: params.grade || 'g4',
        topic: params.topic || 'fractions',
        questionCount: params.questionCount || 3,
        difficulty: params.difficulty || 'medium'
      });
      return NextResponse.json({ success: true, data: quiz });
    
    case 'gradeSubmission':
      const result = await agent.gradeSubmission(params.submission);
      return NextResponse.json({ success: true, data: result });
    
    case 'getCompetencyMastery':
      const mastery = await agent.getCompetencyMastery(
        params.userId || 'user1',
        params.grade || 'g4',
        params.subject || 'Mathematics'
      );
      return NextResponse.json({ success: true, data: mastery });
    
    default:
      return NextResponse.json({ 
        error: 'Invalid action. Available: generateQuiz, gradeSubmission, getCompetencyMastery' 
      }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'SyncSenta AI Agents API',
    agents: [
      {
        name: 'cbc-curriculum',
        description: 'CBC Curriculum Agent - Authoritative KICD knowledge base',
        actions: ['query', 'validate', 'competencies'],
        status: '✅ Implemented'
      },
      {
        name: 'orchestrator',
        description: 'Orchestrator Agent - Coordinates all other agents',
        actions: ['process'],
        status: '✅ Implemented'
      },
      {
        name: 'assessment',
        description: 'Assessment & Feedback Agent - Auto-grading and feedback',
        actions: ['generateQuiz', 'gradeSubmission', 'getCompetencyMastery'],
        status: '✅ Implemented'
      }
    ],
    examples: {
      'cbc-curriculum': {
        query: {
          agent: 'cbc-curriculum',
          action: 'query',
          query: 'What are Grade 4 Mathematics fractions learning outcomes?',
          grade: 'g4',
          subject: 'Mathematics'
        }
      },
      'orchestrator': {
        process: {
          agent: 'orchestrator',
          action: 'process',
          message: 'I need help with fractions',
          userId: 'user1',
          grade: 'g4',
          subject: 'Mathematics'
        }
      },
      'assessment': {
        generateQuiz: {
          agent: 'assessment',
          action: 'generateQuiz',
          subject: 'Mathematics',
          grade: 'g4',
          topic: 'fractions',
          questionCount: 3
        }
      }
    }
  });
}