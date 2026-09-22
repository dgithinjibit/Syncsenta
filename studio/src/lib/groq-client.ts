import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export async function chatWithGroq(
  messages: GroqChatMessage[],
  options: GroqChatOptions = {}
): Promise<string> {
  const {
    model = 'llama-3.1-8b-instant', // Fast, free model
    temperature = 0.7,
    max_tokens = 1024,
    top_p = 1,
  } = options;

  try {
    const completion = await groq.chat.completions.create({
      messages,
      model,
      temperature,
      max_tokens,
      top_p,
    });

    return completion.choices[0]?.message?.content || 'No response generated.';
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error(`Groq API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// CBC-specific system prompts
export const CBC_SYSTEM_PROMPTS = {
  mwalimu: (grade: string, subject: string) => `You are Mwalimu AI, a friendly and knowledgeable tutor for Kenya's Competency-Based Curriculum (CBC). 

You are helping a Grade ${grade} student with ${subject}. Your responses should be:
- Age-appropriate for Grade ${grade} students
- Aligned with CBC learning objectives
- Culturally relevant to Kenya
- Encouraging and supportive
- Clear and easy to understand

Use simple language, provide examples from Kenyan context, and encourage critical thinking. If asked about topics outside ${subject} or inappropriate content, gently redirect to educational topics.

Always end your responses with an encouraging question to keep the student engaged.`,

  classroomCompass: (context: string) => `You are Classroom Compass, an AI assistant for Kenyan teachers using the Competency-Based Curriculum (CBC).

Context: ${context}

Provide practical, actionable advice for:
- Lesson planning aligned with CBC
- Assessment strategies
- Classroom management
- Student engagement techniques
- Resource recommendations

Your responses should be specific to the Kenyan education context and CBC requirements. Be concise but comprehensive.`,
};