/**
 * Gikuyu/Kikuyu Language Agent - Intelligent tutor for Indigenous Language
 * Uses LLM with Kikuyu dictionary knowledge base for contextual responses
 */

import { kikuyuDictionary } from '@/lib/kikuyu-dictionary';
import { generate } from '@genkit-ai/ai';
import { googleAI } from '@genkit-ai/googleai';

interface GikuyuContext {
  grade: string;
  topic?: string;
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface GikuyuResponse {
  response: string; // Plain text, no markdown, no emojis
}

export class GikuyuLanguageAgent {
  private dictionary = kikuyuDictionary;

  /**
   * Generate an intelligent, contextual Gikuyu response using LLM
   */
  async generateResponse(context: GikuyuContext): Promise<GikuyuResponse> {
    const { userMessage, grade, conversationHistory = [] } = context;
    
    // Build knowledge base from dictionary
    const dictionaryContext = this.buildDictionaryContext();
    
    // Create system prompt
    const systemPrompt = `You are a Gikuyu (Kikuyu) language teacher for Grade ${grade} students in Kenya.

CRITICAL RULES:
1. NO MARKDOWN - Never use **bold**, *italic*, or any markdown formatting
2. NO EMOJIS - Never use any emojis in your responses
3. NO REPETITION - Remember previous messages and don't repeat yourself
4. BE CONVERSATIONAL - Respond naturally like a real teacher, not a template
5. NO BULLET POINTS - Use natural sentences instead

YOUR KNOWLEDGE BASE:
${dictionaryContext}

RESPONSE FORMAT:
- Write in plain text only
- Use Gikuyu first, then English translation in parentheses
- Keep responses natural and conversational
- Build on previous conversation context
- Teach progressively, don't dump all vocabulary at once
- If the user speaks Gikuyu, respond naturally and acknowledge their effort

EXAMPLE GOOD RESPONSE:
Wĩ mwega! (Hello!) Nĩ wega gũkuona. (Nice to see you.) What would you like to learn today? I can teach you greetings, numbers, animals, or family words.

EXAMPLE BAD RESPONSE (DON'T DO THIS):
**Wĩ mwega!** 🎉
*Translation:* Hello!
**Vocabulary:**
• wĩ mwega = hello
• ũmũthĩ = today
💡 *Cultural Note:* Greetings are important...

Remember: You're a real teacher having a conversation, not a dictionary bot.`;

    try {
      // Generate response using LLM
      const response = await generate({
        model: googleAI('gemini-1.5-flash'),
        system: systemPrompt,
        prompt: userMessage,
        history: conversationHistory.map(msg => ({
          role: msg.role,
          content: [{ text: msg.content }]
        })),
        config: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      });

      const responseText = response.text || '';
      
      // Strip any remaining emojis or markdown (safety net)
      const cleanResponse = this.cleanResponse(responseText);

      return {
        response: cleanResponse
      };
    } catch (error) {
      console.error('Gikuyu Agent LLM error:', error);
      
      // Fallback to simple response
      return {
        response: `Wĩ mwega! (Hello!) I'm your Gikuyu teacher. What would you like to learn today?`
      };
    }
  }

  /**
   * Build dictionary context for LLM
   */
  private buildDictionaryContext(): string {
    let context = 'GIKUYU-ENGLISH DICTIONARY:\n\n';
    
    // Greetings
    if (this.dictionary.greetings) {
      context += 'GREETINGS:\n';
      Object.entries(this.dictionary.greetings).forEach(([eng, kik]) => {
        context += `${kik} = ${eng}\n`;
      });
      context += '\n';
    }
    
    // Numbers
    if (this.dictionary.numbers) {
      context += 'NUMBERS:\n';
      Object.entries(this.dictionary.numbers).forEach(([eng, kik]) => {
        context += `${kik} = ${eng}\n`;
      });
      context += '\n';
    }
    
    // Family
    if (this.dictionary.family) {
      context += 'FAMILY:\n';
      Object.entries(this.dictionary.family).forEach(([eng, kik]) => {
        context += `${kik} = ${eng}\n`;
      });
      context += '\n';
    }
    
    // Animals
    if (this.dictionary.animals) {
      context += 'ANIMALS:\n';
      Object.entries(this.dictionary.animals).forEach(([eng, kik]) => {
        context += `${kik} = ${eng}\n`;
      });
      context += '\n';
    }
    
    return context;
  }

  /**
   * Clean response - remove emojis and markdown
   */
  private cleanResponse(text: string): string {
    // Remove emojis
    let cleaned = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    
    // Remove markdown bold
    cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
    
    // Remove markdown italic
    cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
    
    // Remove markdown headers
    cleaned = cleaned.replace(/^#+\s+/gm, '');
    
    // Remove bullet points
    cleaned = cleaned.replace(/^[•\-\*]\s+/gm, '');
    
    return cleaned.trim();
  }

  /**
   * Format response for chat interface (plain text only)
   */
  formatForChat(response: GikuyuResponse): string {
    return response.response;
  }
}
