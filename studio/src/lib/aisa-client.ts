/**
 * AISA.one API Client for SyncSenta
 * Unified access to 50+ LLMs through single API
 */

interface AISAConfig {
  apiKey: string;
  baseUrl: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AISARequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface AISAResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AISAClient {
  private config: AISAConfig;

  constructor() {
    this.config = {
      apiKey: process.env.AISA_API_KEY || '',
      baseUrl: process.env.AISA_BASE_URL || 'https://api.aisa.one/v1'
    };

    if (!this.config.apiKey) {
      throw new Error('AISA_API_KEY environment variable is required');
    }
  }

  /**
   * Generate response using specified model
   */
  async generate(
    prompt: string, 
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    const {
      model = 'deepseek-v3',  // Default to cost-effective model
      temperature = 0.3,
      maxTokens = 1000,
      systemPrompt = 'You are Mwalimu, an AI assistant for Kenya\'s CBC education system.'
    } = options;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const request: AISARequest = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AISA API error: ${response.status} - ${errorText}`);
      }

      const data: AISAResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response choices returned from AISA API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('AISA API call failed:', error);
      throw error;
    }
  }

  /**
   * Generate Mwalimu AI response with CBC context
   */
  async generateMwalimuResponse(
    prompt: string,
    grade?: string,
    subject?: string
  ): Promise<string> {
    const cbcSystemPrompt = `You are Mwalimu, an AI assistant specialized in Kenya's Competency-Based Curriculum (CBC).

Your role:
- Help students, teachers, and parents with CBC-aligned educational content
- Provide responses in English, Kiswahili, or local languages as appropriate
- Ensure all content aligns with KICD standards
- Use culturally relevant examples from Kenyan context
- Be encouraging and supportive in your teaching approach

${grade ? `Current context: ${grade}` : ''}
${subject ? `Subject focus: ${subject}` : ''}

Always provide accurate, helpful, and culturally appropriate responses.`;

    return this.generate(prompt, {
      model: 'deepseek-v3',  // Good balance of cost and quality
      temperature: 0.3,      // Consistent educational responses
      maxTokens: 1500,       // Detailed explanations
      systemPrompt: cbcSystemPrompt
    });
  }

  /**
   * Generate response for classroom compass (lesson planning)
   */
  async generateClassroomCompass(
    prompt: string,
    grade: string,
    subject: string
  ): Promise<string> {
    const compassSystemPrompt = `You are Classroom Compass, an AI assistant for CBC lesson planning and teaching strategies.

Your expertise:
- Create detailed lesson plans aligned with CBC competencies
- Suggest teaching methodologies appropriate for Kenyan classrooms
- Provide assessment strategies and rubrics
- Recommend resources available in Kenyan schools
- Consider diverse learning needs and local context

Current context: ${grade} ${subject}

Focus on practical, implementable teaching strategies that work in Kenyan educational settings.`;

    return this.generate(prompt, {
      model: 'claude-3.5-sonnet',  // Better for complex planning tasks
      temperature: 0.4,            // Slightly more creative for lesson planning
      maxTokens: 2000,             // Detailed lesson plans
      systemPrompt: compassSystemPrompt
    });
  }

  /**
   * Test connection to AISA API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generate('Hello, test connection', {
        model: 'deepseek-v3',
        maxTokens: 50
      });
      
      return response.length > 0;
    } catch (error) {
      console.error('AISA connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models (if AISA provides this endpoint)
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.map((model: any) => model.id) || [];
      }
    } catch (error) {
      console.error('Failed to fetch available models:', error);
    }

    // Fallback to known models
    return [
      'deepseek-v3',
      'qwen-2.5-72b',
      'claude-3.5-sonnet',
      'gpt-4o',
      'gemini-1.5-pro',
      'llama-3.1-8b'
    ];
  }

  /**
   * Smart model selection based on task complexity
   */
  selectOptimalModel(taskType: 'simple' | 'complex' | 'creative'): string {
    switch (taskType) {
      case 'simple':
        return 'deepseek-v3';        // $0.14/1M tokens - Q&A, basic explanations
      case 'complex':
        return 'claude-3.5-sonnet';  // $3/1M tokens - Lesson planning, analysis
      case 'creative':
        return 'gpt-4o';             // $2.5/1M tokens - Creative writing, stories
      default:
        return 'deepseek-v3';
    }
  }
}

// Export singleton instance
export const aisaClient = new AISAClient();