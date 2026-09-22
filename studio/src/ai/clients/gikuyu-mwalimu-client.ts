/**
 * Gikuyu-Aware Mwalimu AI Client
 * 
 * This client integrates the fine-tuned Gikuyu model with the Mwalimu AI flow.
 * It supports both HuggingFace (cloud) and Ollama (local) deployments.
 */

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GikuyuMwalimuConfig {
  endpoint: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export class GikuyuMwalimuClient {
  private endpoint: string;
  private apiKey?: string;
  private maxTokens: number;
  private temperature: number;
  private timeout: number;

  constructor(config: GikuyuMwalimuConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.maxTokens = config.maxTokens || 512;
    this.temperature = config.temperature || 0.3;
    this.timeout = config.timeout || 30000; // 30 seconds
  }

  /**
   * Generate a response from the fine-tuned Gikuyu model
   * 
   * @param message - The user's message
   * @param history - Previous conversation turns
   * @returns The AI's response
   */
  async generateResponse(
    message: string,
    history: ConversationTurn[] = []
  ): Promise<string> {
    try {
      const prompt = this.formatPrompt(message, history);
      
      // Detect if using Ollama (local) or HuggingFace (cloud)
      const isOllama = this.endpoint.includes('localhost') || this.endpoint.includes('127.0.0.1');
      
      if (isOllama) {
        return await this.generateOllama(prompt);
      } else {
        return await this.generateHuggingFace(prompt);
      }
    } catch (error) {
      console.error('Gikuyu Mwalimu Client Error:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Format the prompt with conversation history using Phi-3 chat template
   */
  private formatPrompt(message: string, history: ConversationTurn[]): string {
    let prompt = "<s>";
    
    // Add conversation history
    for (const turn of history) {
      prompt += `<|${turn.role}|>\n${turn.content}<|end|>\n`;
    }
    
    // Add current user message
    prompt += `<|user|>\n${message}<|end|>\n<|assistant|>\n`;
    
    return prompt;
  }

  /**
   * Generate response using HuggingFace Inference API
   */
  private async generateHuggingFace(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: this.maxTokens,
            temperature: this.temperature,
            top_p: 0.9,
            do_sample: true,
            return_full_text: false
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // HuggingFace returns array of generated text
      if (Array.isArray(data) && data.length > 0) {
        return data[0].generated_text || data[0];
      }
      
      return data.generated_text || data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: HuggingFace API took too long to respond');
      }
      
      throw error;
    }
  }

  /**
   * Generate response using Ollama (local deployment)
   */
  private async generateOllama(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gikuyu-mwalimu',
          prompt: prompt,
          stream: false,
          options: {
            temperature: this.temperature,
            num_predict: this.maxTokens,
            top_p: 0.9,
            top_k: 40
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Ollama took too long to respond');
      }
      
      throw error;
    }
  }

  /**
   * Detect if a message contains Gikuyu language
   */
  detectGikuyu(message: string): boolean {
    const gikuyuPatterns = [
      /wĩ\s+mwega/i,  // Hello
      /ũrĩ\s+atĩa/i,  // How are you
      /ngwendaga/i,   // I want
      /nĩ\s+ũrĩa/i,   // That is
      /mũndũ/i,       // Person
      /mũrĩ/i,        // You are
    ];

    return gikuyuPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Detect if a message contains an identity statement
   */
  detectIdentityStatement(message: string): { isIdentity: boolean; ethnicity?: string } {
    const identityPatterns = [
      { pattern: /im\s+kikuyu/i, ethnicity: 'Kikuyu' },
      { pattern: /i\s+am\s+kikuyu/i, ethnicity: 'Kikuyu' },
      { pattern: /im\s+a\s+kikuyu/i, ethnicity: 'Kikuyu' },
      { pattern: /im\s+luo/i, ethnicity: 'Luo' },
      { pattern: /i\s+am\s+luo/i, ethnicity: 'Luo' },
      { pattern: /im\s+maasai/i, ethnicity: 'Maasai' },
      { pattern: /i\s+am\s+maasai/i, ethnicity: 'Maasai' },
    ];

    for (const { pattern, ethnicity } of identityPatterns) {
      if (pattern.test(message)) {
        return { isIdentity: true, ethnicity };
      }
    }

    return { isIdentity: false };
  }
}

/**
 * Factory function to create a Gikuyu Mwalimu client
 */
export function createGikuyuMwalimuClient(
  deployment: 'huggingface' | 'ollama' = 'huggingface'
): GikuyuMwalimuClient {
  if (deployment === 'ollama') {
    return new GikuyuMwalimuClient({
      endpoint: 'http://localhost:11434',
      maxTokens: 512,
      temperature: 0.3,
      timeout: 30000
    });
  } else {
    // HuggingFace deployment
    const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;
    const username = process.env.HUGGINGFACE_USERNAME || 'YOUR_USERNAME';
    
    return new GikuyuMwalimuClient({
      endpoint: `https://api-inference.huggingface.co/models/${username}/Gikuyu-Mwalimu-AI-v1-merged`,
      apiKey: apiKey,
      maxTokens: 512,
      temperature: 0.3,
      timeout: 30000
    });
  }
}
