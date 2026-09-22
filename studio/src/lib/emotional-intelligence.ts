/**
 * Emotional Intelligence Module for Mwalimu AI
 * 
 * Detects student emotional state and provides appropriate encouragement.
 * Helps students feel supported and motivated during learning.
 */

export interface EmotionalState {
  sentiment: 'frustrated' | 'confused' | 'confident' | 'neutral' | 'excited';
  confidence: number; // 0-1
  needsEncouragement: boolean;
  detectedPatterns: string[];
}

export interface EncouragementMessage {
  message: string;
  tone: 'supportive' | 'celebratory' | 'reassuring' | 'motivational';
}

/**
 * Analyze student message for emotional cues
 */
export function analyzeEmotionalState(
  message: string,
  history?: Array<{ role: 'user' | 'model'; content: string }>
): EmotionalState {
  const lowerMessage = message.toLowerCase();
  const detectedPatterns: string[] = [];
  
  // Frustration indicators
  const frustrationKeywords = [
    'i don\'t understand', 'i don\'t get it', 'this is hard', 'too difficult',
    'i can\'t', 'i give up', 'this doesn\'t make sense', 'confused',
    'why is this so hard', 'i\'m stuck', 'help', 'i\'m lost'
  ];
  
  // Confusion indicators
  const confusionKeywords = [
    'what does', 'how do', 'why', 'what is', 'explain', 'i\'m not sure',
    'maybe', 'i think', 'is it', 'could it be'
  ];
  
  // Confidence indicators
  const confidenceKeywords = [
    'i know', 'i understand', 'i got it', 'i see', 'that makes sense',
    'i can do this', 'i think i know', 'let me try'
  ];
  
  // Excitement indicators
  const excitementKeywords = [
    'wow', 'cool', 'awesome', 'amazing', 'i love', 'this is fun',
    'interesting', 'great', 'yay', '!', 'nice'
  ];
  
  let sentiment: EmotionalState['sentiment'] = 'neutral';
  let confidence = 0.5;
  
  // Check for frustration
  const hasFrustration = frustrationKeywords.some(kw => lowerMessage.includes(kw));
  if (hasFrustration) {
    sentiment = 'frustrated';
    confidence = 0.2;
    detectedPatterns.push('frustration_keywords');
  }
  
  // Check for confusion
  const hasConfusion = confusionKeywords.some(kw => lowerMessage.includes(kw));
  if (hasConfusion && sentiment === 'neutral') {
    sentiment = 'confused';
    confidence = 0.4;
    detectedPatterns.push('confusion_keywords');
  }
  
  // Check for confidence
  const hasConfidence = confidenceKeywords.some(kw => lowerMessage.includes(kw));
  if (hasConfidence) {
    sentiment = 'confident';
    confidence = 0.8;
    detectedPatterns.push('confidence_keywords');
  }
  
  // Check for excitement
  const hasExcitement = excitementKeywords.some(kw => lowerMessage.includes(kw));
  if (hasExcitement && !hasConfidence) {
    sentiment = 'excited';
    confidence = 0.9;
    detectedPatterns.push('excitement_keywords');
  }
  
  // Check for repeated questions (indicates struggle)
  if (history && history.length > 2) {
    const recentUserMessages = history
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content.toLowerCase());
    
    const hasRepeatedQuestions = recentUserMessages.some((msg, i) => 
      recentUserMessages.slice(i + 1).some(other => 
        msg.includes(other) || other.includes(msg)
      )
    );
    
    if (hasRepeatedQuestions && sentiment === 'neutral') {
      sentiment = 'frustrated';
      confidence = 0.3;
      detectedPatterns.push('repeated_questions');
    }
  }
  
  // Check message length (very short might indicate frustration)
  if (message.trim().split(/\s+/).length <= 3 && !hasExcitement) {
    if (sentiment === 'neutral') {
      sentiment = 'confused';
      confidence = 0.4;
    }
    detectedPatterns.push('short_message');
  }
  
  const needsEncouragement = sentiment === 'frustrated' || sentiment === 'confused' || confidence < 0.5;
  
  return {
    sentiment,
    confidence,
    needsEncouragement,
    detectedPatterns,
  };
}

/**
 * Generate culturally appropriate encouragement message
 */
export function generateEncouragement(
  emotionalState: EmotionalState,
  studentName?: string,
  subject?: string
): EncouragementMessage | null {
  if (!emotionalState.needsEncouragement) {
    return null;
  }
  
  const name = studentName || 'my friend';
  
  // Kenyan cultural context - use Swahili phrases and local references
  const encouragementMessages = {
    frustrated: [
      `Pole pole, ${name}! (Take it easy!) Learning takes time, and you're doing great by asking questions. Let's break this down together, step by step. 🌟`,
      `${name}, I can see you're working hard! Remember, even the best students in Kenya struggled with this at first. You're on the right path - let's try a different approach. 💪`,
      `Hakuna matata, ${name}! Every Kenyan student finds ${subject || 'this'} challenging at first. The fact that you're still trying shows real strength. Let me help you see it differently. 🎯`,
      `${name}, you're not alone in finding this tough! Even teachers had to practice this many times. Let's take a short break and come back with fresh eyes. You've got this! ✨`,
    ],
    confused: [
      `That's a great question, ${name}! Asking "why" and "how" shows you're thinking deeply. Let me explain it in a way that makes more sense. 🤔`,
      `${name}, confusion is the first step to understanding! You're exactly where you should be. Let me show you with an example from everyday Kenyan life. 🌍`,
      `I love that you're asking questions, ${name}! That's how the best students learn. Let's clear this up together - I'll use simpler words. 📚`,
      `${name}, it's okay to be unsure! Even CBC teachers take time to understand new concepts. Let me break it down into smaller pieces for you. 🧩`,
    ],
  };
  
  const messages = encouragementMessages[emotionalState.sentiment as 'frustrated' | 'confused'];
  if (!messages) return null;
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  
  const tone = emotionalState.sentiment === 'frustrated' ? 'reassuring' : 'supportive';
  
  return {
    message: randomMessage,
    tone,
  };
}

/**
 * Generate celebration message for confident/excited students
 */
export function generateCelebration(
  emotionalState: EmotionalState,
  studentName?: string
): EncouragementMessage | null {
  if (emotionalState.sentiment !== 'confident' && emotionalState.sentiment !== 'excited') {
    return null;
  }
  
  const name = studentName || 'my friend';
  
  const celebrationMessages = [
    `Hongera, ${name}! (Congratulations!) You're really getting the hang of this! 🎉`,
    `Vizuri sana, ${name}! (Very good!) Your understanding is growing stronger every day! ⭐`,
    `${name}, you're doing amazing! Keep up this excellent work - you're making great progress! 🚀`,
    `That's the spirit, ${name}! You're thinking like a true scholar! 🌟`,
    `Poa sana, ${name}! (Very cool!) You've got this concept down! 💯`,
  ];
  
  const randomMessage = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
  
  return {
    message: randomMessage,
    tone: 'celebratory',
  };
}

/**
 * Inject emotional intelligence into system prompt
 */
export function enhancePromptWithEmotionalIntelligence(
  basePrompt: string,
  emotionalState: EmotionalState,
  studentName?: string,
  subject?: string
): string {
  const encouragement = generateEncouragement(emotionalState, studentName, subject);
  const celebration = generateCelebration(emotionalState, studentName);
  
  let emotionalGuidance = '';
  
  if (encouragement) {
    emotionalGuidance = `
# EMOTIONAL SUPPORT GUIDANCE
The student is showing signs of ${emotionalState.sentiment} (confidence: ${(emotionalState.confidence * 100).toFixed(0)}%).
Detected patterns: ${emotionalState.detectedPatterns.join(', ')}

IMPORTANT: Start your response with this encouragement message:
"${encouragement.message}"

Then proceed to answer their question with extra patience and clarity. Use:
- Simpler language
- More examples from Kenyan daily life (chapati, matatu, shillings, etc.)
- Step-by-step breakdown
- Positive reinforcement throughout
`;
  } else if (celebration) {
    emotionalGuidance = `
# CELEBRATION GUIDANCE
The student is showing ${emotionalState.sentiment} energy! (confidence: ${(emotionalState.confidence * 100).toFixed(0)}%)

IMPORTANT: Start your response with this celebration:
"${celebration.message}"

Then build on their enthusiasm by:
- Acknowledging their progress
- Introducing a slightly more challenging concept
- Encouraging them to help others
`;
  }
  
  return emotionalGuidance ? `${basePrompt}\n\n${emotionalGuidance}` : basePrompt;
}
