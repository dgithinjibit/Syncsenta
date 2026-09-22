/**
 * CBC Curriculum Agent Client
 * 
 * Client library for calling the CBC Curriculum Agent HTTP API from Mwalimu AI Service.
 * Implements pre-query hook, context enrichment, fallback logic, and response caching.
 */

import { LRUCache } from 'lru-cache';

// Types
export interface CBCQueryRequest {
  query: string;
  grade_level?: string;
  subject?: string;
  strand?: string;
}

export interface CBCQueryResponse {
  response_text: string;
  citations: Citation[];
  retrieved_sections: RetrievedSection[];
  model_used: string;
  response_time_ms: number;
  from_cache: boolean;
}

export interface Citation {
  grade_level: string;
  subject: string;
  strand: string;
  text: string;
}

export interface RetrievedSection {
  grade_level: string;
  subject: string;
  strand: string;
  content: string;
  similarity_score: number;
}

export interface CBCAgentError {
  error: string;
  details?: string;
}

// Configuration
const CBC_AGENT_URL = process.env.CBC_AGENT_URL || 'http://localhost:8080';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_MAX_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 5000; // 5 seconds

// Response cache (1-hour TTL)
const responseCache = new LRUCache<string, CBCQueryResponse>({
  max: CACHE_MAX_SIZE,
  ttl: CACHE_TTL_MS,
});

/**
 * Extract curriculum-relevant portion from student question
 */
function extractCurriculumQuery(studentMessage: string, subject: string, grade: string): string {
  // Remove conversational fluff
  let query = studentMessage
    .toLowerCase()
    .replace(/^(hi|hello|hey|jambo|habari|sawa|please|can you|could you|i want to|i need to|help me|teach me)\s*/gi, '')
    .replace(/\?+$/, '')
    .trim();
  
  // If query is too short, add context
  if (query.length < 10) {
    query = `${subject} ${grade}: ${query}`;
  }
  
  return query;
}

/**
 * Generate cache key for query
 */
function getCacheKey(request: CBCQueryRequest): string {
  return JSON.stringify({
    query: request.query.toLowerCase().trim(),
    grade_level: request.grade_level,
    subject: request.subject,
    strand: request.strand,
  });
}

/**
 * Call CBC Agent /api/curriculum/query endpoint
 */
async function callCBCAgent(request: CBCQueryRequest): Promise<CBCQueryResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    const response = await fetch(`${CBC_AGENT_URL}/api/curriculum/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error: CBCAgentError = await response.json();
      throw new Error(`CBC Agent error: ${error.error} - ${error.details || ''}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('CBC Agent request timeout');
      }
      throw error;
    }
    throw new Error('Unknown error calling CBC Agent');
  }
}

/**
 * Query CBC Agent with caching and fallback
 * 
 * This is the main pre-query hook that Mwalimu AI calls before generating responses.
 */
export async function queryCBCAgent(
  studentMessage: string,
  subject: string,
  grade: string,
  strand?: string
): Promise<CBCQueryResponse | null> {
  try {
    // Extract curriculum-relevant query
    const query = extractCurriculumQuery(studentMessage, subject, grade);
    
    const request: CBCQueryRequest = {
      query,
      grade_level: grade,
      subject,
      strand,
    };
    
    // Check cache first
    const cacheKey = getCacheKey(request);
    const cached = responseCache.get(cacheKey);
    if (cached) {
      console.log('✅ CBC Agent cache hit');
      return { ...cached, from_cache: true };
    }
    
    // Call CBC Agent
    console.log('🔍 Querying CBC Agent:', query);
    const startTime = Date.now();
    const response = await callCBCAgent(request);
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ CBC Agent responded in ${elapsed}ms (${response.citations.length} citations)`);
    
    // Cache response
    responseCache.set(cacheKey, response);
    
    return response;
  } catch (error) {
    console.warn('⚠️ CBC Agent query failed (non-blocking):', error);
    // Return null to allow Mwalimu to proceed without curriculum grounding
    return null;
  }
}

/**
 * Format CBC Agent response for inclusion in Mwalimu's LLM context
 */
export function formatCBCContextForPrompt(cbcResponse: CBCQueryResponse): string {
  if (!cbcResponse || cbcResponse.retrieved_sections.length === 0) {
    return '';
  }
  
  const sections = cbcResponse.retrieved_sections
    .slice(0, 3) // Top 3 most relevant
    .map((section, idx) => {
      return `${idx + 1}. ${section.grade_level} ${section.subject} - ${section.strand}
   ${section.content}
   [Relevance: ${Math.round(section.similarity_score * 100)}%]`;
    })
    .join('\n\n');
  
  const citations = cbcResponse.citations
    .map(c => `- [KICD: ${c.grade_level}/${c.subject}/${c.strand}] ${c.text}`)
    .join('\n');
  
  return `# OFFICIAL CBC CURRICULUM CONTEXT (from KICD):

${sections}

# CURRICULUM CITATIONS:
${citations}

IMPORTANT: Use this official curriculum context to ground your response. Cite specific learning outcomes when relevant.`;
}

/**
 * Format citations for display in student-facing response
 */
export function formatCitationsForDisplay(citations: Citation[]): string {
  if (citations.length === 0) {
    return '';
  }
  
  return `\n\n📚 **Curriculum References:**\n${citations
    .map((c, idx) => `${idx + 1}. ${c.grade_level} ${c.subject} - ${c.strand}`)
    .join('\n')}`;
}

/**
 * Clear response cache (useful for testing or when curriculum is updated)
 */
export function clearCBCCache(): void {
  responseCache.clear();
  console.log('🗑️ CBC Agent cache cleared');
}

/**
 * Get cache statistics
 */
export function getCBCCacheStats() {
  return {
    size: responseCache.size,
    maxSize: CACHE_MAX_SIZE,
    ttl: CACHE_TTL_MS,
  };
}
