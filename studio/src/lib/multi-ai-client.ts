/**
 * Multi-Provider AI Client for SyncSenta
 * Handles multiple Groq accounts + AISA.one fallback
 * Automatic failover when rate limits are hit
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
}

interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  maxRetries: number;
}

export class MultiAIClient {
  private groqProviders: ProviderConfig[] = [];
  private aisaProvider: ProviderConfig | null = null;
  private currentGroqIndex = 0;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize multiple Groq providers
    for (let i = 1; i <= 10; i++) {
      const apiKey = process.env[`GROQ_API_KEY_${i}`];
      if (apiKey) {
        this.groqProviders.push({
          name: `groq-${i}`,
          apiKey,
          baseUrl: 'https://api.groq.com/openai/v1',
          model: 'llama-3.1-8b-instant',
          maxRetries: 2
        });
      }
    }

    // Initialize AISA provider
    if (process.env.AISA_API_KEY) {
      this.aisaProvider = {
        name: 'aisa-deepseek',
        apiKey: process.env.AISA_API_KEY,
        baseUrl: process.env.AISA_BASE_URL || 'https://api.aisa.one/v1',
        model: 'deepseek-v3',
        maxRetries: 2
      };
    }

    console.log(`🔧 Initialized ${this.groqProviders.length} Groq providers + ${this.aisaProvider ? 1 : 0} AISA provider`);
  }

  /**
   * Generate AI response with automatic provider fallback
   */
  async generateResponse(
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      preferredProvider?: 'groq' | 'aisa';
    } = {}
  ): Promise<AIResponse> {
    const { temperature = 0.3, maxTokens = 1000, preferredProvider = 'groq' } = options;

    // Try providers in order: Groq accounts → AISA
    const providers = this.getProviderOrder(preferredProvider);

    for (const provider of providers) {
      try {
        console.log(`🔄 Trying provider: ${provider.name}`);
        
        const response = await this.callProvider(provider, messages, {
          temperature,
          maxTokens
        });

        console.log(`✅ Success with provider: ${provider.name}`);
        return response;

      } catch (error: any) {
        console.log(`❌ Provider ${provider.name} failed:`, error.message);
        
        // If this is a Groq rate limit, move to next Groq account
        if (provider.name.startsWith('groq') && this.isRateLimitError(error)) {
          this.rotateGroqProvider();
        }
        
        // Continue to next provider
        continue;
      }
    }

    throw new Error('All AI providers are currently unavailable. Please try again later.');
  }

  /**
   * Stream AI response with automatic provider fallback.
   * Yields content chunks as they arrive; resolves with the final aggregated response.
   */
  async *generateResponseStream(
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      preferredProvider?: 'groq' | 'aisa';
    } = {}
  ): AsyncGenerator<
    { type: 'chunk'; content: string } | { type: 'done'; final: AIResponse },
    void,
    unknown
  > {
    const { temperature = 0.3, maxTokens = 1000, preferredProvider = 'groq' } = options;
    const providers = this.getProviderOrder(preferredProvider);

    let lastError: Error | null = null;
    for (const provider of providers) {
      try {
        let aggregated = '';
        let tokensUsed: number | undefined;
        let modelUsed = provider.model;

        for await (const evt of this.callProviderStream(provider, messages, {
          temperature,
          maxTokens,
        })) {
          if (evt.type === 'chunk') {
            aggregated += evt.content;
            yield { type: 'chunk', content: evt.content };
          } else {
            tokensUsed = evt.tokensUsed;
            modelUsed = evt.model || provider.model;
          }
        }

        yield {
          type: 'done',
          final: {
            content: aggregated,
            provider: provider.name,
            model: modelUsed,
            tokensUsed,
          },
        };
        return;
      } catch (error: any) {
        lastError = error;
        console.log(`❌ Provider ${provider.name} stream failed:`, error.message);
        if (provider.name.startsWith('groq') && this.isRateLimitError(error)) {
          this.rotateGroqProvider();
        }
        continue;
      }
    }

    throw lastError || new Error('All AI providers are currently unavailable.');
  }

  /**
   * Call a specific provider with SSE streaming.
   */
  private async *callProviderStream(
    provider: ProviderConfig,
    messages: ChatMessage[],
    options: { temperature: number; maxTokens: number },
  ): AsyncGenerator<
    { type: 'chunk'; content: string } | { type: 'final'; tokensUsed?: number; model?: string },
    void,
    unknown
  > {
    const requestBody = {
      model: provider.model,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true,
    };

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`${provider.name} API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let tokensUsed: number | undefined;
    let modelUsed: string | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          yield { type: 'final', tokensUsed, model: modelUsed };
          return;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.model) modelUsed = parsed.model;
          if (parsed.usage?.total_tokens) tokensUsed = parsed.usage.total_tokens;
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            yield { type: 'chunk', content: delta };
          }
        } catch {
          // Ignore malformed SSE chunk; providers occasionally split JSON across frames.
        }
      }
    }

    yield { type: 'final', tokensUsed, model: modelUsed };
  }

  /**
   * Call a specific provider
   */
  private async callProvider(
    provider: ProviderConfig,
    messages: ChatMessage[],
    options: { temperature: number; maxTokens: number }
  ): Promise<AIResponse> {
    const requestBody = {
      model: provider.model,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens
    };

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${provider.name} API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error(`No response choices from ${provider.name}`);
    }

    return {
      content: data.choices[0].message.content,
      provider: provider.name,
      model: data.model || provider.model,
      tokensUsed: data.usage?.total_tokens
    };
  }

  /**
   * Get provider order based on preference
   */
  private getProviderOrder(preferredProvider: 'groq' | 'aisa'): ProviderConfig[] {
    const providers: ProviderConfig[] = [];

    if (preferredProvider === 'groq') {
      // Add all Groq providers starting from current index
      for (let i = 0; i < this.groqProviders.length; i++) {
        const index = (this.currentGroqIndex + i) % this.groqProviders.length;
        providers.push(this.groqProviders[index]);
      }
      // Add AISA as fallback
      if (this.aisaProvider) {
        providers.push(this.aisaProvider);
      }
    } else {
      // AISA first, then Groq
      if (this.aisaProvider) {
        providers.push(this.aisaProvider);
      }
      providers.push(...this.groqProviders);
    }

    return providers;
  }

  /**
   * Rotate to next Groq provider when rate limited
   */
  private rotateGroqProvider() {
    if (this.groqProviders.length > 1) {
      this.currentGroqIndex = (this.currentGroqIndex + 1) % this.groqProviders.length;
      console.log(`🔄 Rotated to Groq provider ${this.currentGroqIndex + 1}`);
    }
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    return (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('429') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('too many requests')
    );
  }

  /**
   * Generate CBC-specific response with Mwalimu context
   */
  async generateMwalimuResponse(
    prompt: string,
    grade?: string,
    subject?: string
  ): Promise<AIResponse> {
    const systemPrompt = `You are Mwalimu, an AI assistant specialized in Kenya's Competency-Based Curriculum (CBC).

Your role:
- Help students, teachers, and parents with CBC-aligned educational content
- Provide responses in English, Kiswahili, or local languages as appropriate
- Ensure all content aligns with KICD standards
- Use culturally relevant examples from Kenyan context
- Be encouraging and supportive in your teaching approach

${grade ? `Current context: ${grade}` : ''}
${subject ? `Subject focus: ${subject}` : ''}

Always provide accurate, helpful, and culturally appropriate responses.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    return this.generateResponse(messages, {
      temperature: 0.3,
      maxTokens: 1500,
      preferredProvider: 'groq' // Prefer free Groq first
    });
  }

  /**
   * Generate Classroom Compass response for lesson planning
   */
  async generateClassroomCompass(
    prompt: string,
    grade: string,
    subject: string
  ): Promise<AIResponse> {
    const systemPrompt = `You are Classroom Compass, an AI assistant for CBC lesson planning and teaching strategies.

Your expertise:
- Create detailed lesson plans aligned with CBC competencies
- Suggest teaching methodologies appropriate for Kenyan classrooms
- Provide assessment strategies and rubrics
- Recommend resources available in Kenyan schools
- Consider diverse learning needs and local context

Current context: ${grade} ${subject}

Focus on practical, implementable teaching strategies that work in Kenyan educational settings.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    return this.generateResponse(messages, {
      temperature: 0.4,
      maxTokens: 2000,
      preferredProvider: 'aisa' // Use AISA for complex planning
    });
  }

  /**
   * Get provider status and statistics
   */
  getProviderStatus(): {
    groqProviders: number;
    currentGroqIndex: number;
    aisaAvailable: boolean;
    totalProviders: number;
  } {
    return {
      groqProviders: this.groqProviders.length,
      currentGroqIndex: this.currentGroqIndex,
      aisaAvailable: !!this.aisaProvider,
      totalProviders: this.groqProviders.length + (this.aisaProvider ? 1 : 0)
    };
  }

  /**
   * Test all providers
   */
  async testAllProviders(): Promise<{
    working: string[];
    failed: string[];
    details: Record<string, any>;
  }> {
    const working: string[] = [];
    const failed: string[] = [];
    const details: Record<string, any> = {};

    const testMessage: ChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, test connection.' }
    ];

    // Test all Groq providers
    for (const provider of this.groqProviders) {
      try {
        const response = await this.callProvider(provider, testMessage, {
          temperature: 0.3,
          maxTokens: 50
        });
        working.push(provider.name);
        details[provider.name] = { status: 'working', model: response.model };
      } catch (error: any) {
        failed.push(provider.name);
        details[provider.name] = { status: 'failed', error: error.message };
      }
    }

    // Test AISA provider
    if (this.aisaProvider) {
      try {
        const response = await this.callProvider(this.aisaProvider, testMessage, {
          temperature: 0.3,
          maxTokens: 50
        });
        working.push(this.aisaProvider.name);
        details[this.aisaProvider.name] = { status: 'working', model: response.model };
      } catch (error: any) {
        failed.push(this.aisaProvider.name);
        details[this.aisaProvider.name] = { status: 'failed', error: error.message };
      }
    }

    return { working, failed, details };
  }
}

// Export singleton instance
export const multiAIClient = new MultiAIClient();