/**
 * @fileOverview Dify Agent Configuration for SyncSenta
 * 
 * This file configures the Dify agent to integrate with Hugging Face datasets
 * for the Kenyan education sector, combining Magic School AI and Synthesis Tutor
 * features with the Mwalimu AI Socratic tutor.
 */

export const difyAgentConfig = {
  name: "SyncSenta-Dify-Agent",
  description: "AI-powered educational agent for Kenyan CBC curriculum, combining Magic School AI and Synthesis Tutor features",
  
  // Hugging Face datasets to integrate
  datasets: [
    {
      id: "princeton-nlp/fineweb_edu-swahili-translated",
      name: "FineWeb Educational Content (Swahili)",
      purpose: "High-quality educational content for curriculum grounding",
      type: "text",
    },
    {
      id: "Nadhari/Swahili-Thinking",
      name: "Swahili Chain-of-Thought Reasoning",
      purpose: "Enhance Socratic reasoning and step-by-step guidance",
      type: "text",
    },
    {
      id: "iamshnoo/alpaca-cleaned-swahili",
      name: "Swahili Instruction-Following Dataset",
      purpose: "Improve conversational abilities and instruction following",
      type: "text",
    },
    {
      id: "Rogendo/English-Swahili-Sentence-Pairs",
      name: "English-Swahili Parallel Corpus",
      purpose: "Support multilingual understanding and translation",
      type: "text",
    },
    {
      id: "DigitalUmuganda/Afrivoice_Swahili",
      name: "Afrivoice Swahili Multimodal Dataset",
      purpose: "Enable voice-based interactions for students",
      type: "audio",
    },
  ],

  // Agent capabilities combining Magic School AI and Synthesis Tutor
  capabilities: {
    // Magic School AI features
    magicSchool: {
      lessonPlanGeneration: {
        enabled: true,
        description: "Generate CBC-aligned lesson plans",
        prompt: "Generate a comprehensive lesson plan for {subject} at {grade} level aligned with the Kenyan CBC curriculum.",
      },
      worksheetGeneration: {
        enabled: true,
        description: "Create engaging worksheets for students",
        prompt: "Create an engaging worksheet for {subject} covering {topic} suitable for {grade} level students.",
      },
      rubricGeneration: {
        enabled: true,
        description: "Develop assessment rubrics",
        prompt: "Generate a detailed rubric for assessing {subject} work at {grade} level.",
      },
      quizGeneration: {
        enabled: true,
        description: "Create multiple-choice quizzes",
        prompt: "Generate a multiple-choice quiz for {subject} on {topic} at {grade} level.",
      },
    },

    // Synthesis Tutor features
    synthesisTutor: {
      stepByStepGuidance: {
        enabled: true,
        description: "Provide step-by-step guidance for problem-solving",
        prompt: "Guide the student through solving {problem} step by step, asking guiding questions at each stage.",
      },
      adaptiveLearning: {
        enabled: true,
        description: "Adapt to student's pace and understanding",
        prompt: "Assess the student's understanding of {concept} and adjust the explanation accordingly.",
      },
      multisensoryApproach: {
        enabled: true,
        description: "Engage multiple learning modalities",
        prompt: "Explain {concept} using visual, auditory, and kinesthetic approaches.",
      },
    },

    // Mwalimu AI features (existing)
    mwalimuAI: {
      socraticTutoring: {
        enabled: true,
        description: "Socratic method-based tutoring",
        prompt: "Guide the student through {topic} using the Socratic method, asking thoughtful questions.",
      },
      culturalRelevance: {
        enabled: true,
        description: "Use Kenyan cultural context in explanations",
        prompt: "Explain {concept} using examples from Kenyan culture and daily life.",
      },
    },
  },

  // System prompt for the Dify agent
  systemPrompt: `You are SyncSenta, an advanced AI educational agent for the Kenyan education sector. You combine the best features of Magic School AI, Synthesis Tutor, and Mwalimu AI to provide comprehensive educational support.

Your core mission:
1. Support students with Socratic tutoring aligned to the Kenyan CBC curriculum
2. Assist teachers with lesson planning, worksheet generation, and assessment tools
3. Provide step-by-step guidance with adaptive learning
4. Use culturally relevant examples from Kenya
5. Support both English and Swahili languages

Your values:
- Nurture every learner's potential
- Engage and empower ethical citizens
- Promote critical thinking and problem-solving
- Celebrate diversity and inclusion
- Foster digital literacy

When responding:
- Always ground responses in the Kenyan CBC curriculum
- Use simple, age-appropriate language for students
- Provide actionable guidance for teachers
- Maintain a warm, encouraging tone
- Respect cultural sensitivities
- Use Swahili greetings naturally when appropriate`,

  // Integration points
  integrations: {
    firebase: {
      enabled: true,
      description: "Store learning summaries and student progress",
    },
    genkit: {
      enabled: true,
      description: "Leverage Google Genkit for AI flows",
    },
    huggingface: {
      enabled: true,
      description: "Access Hugging Face datasets and models",
    },
  },

  // Model configuration
  models: {
    primary: "gemini-2.5-flash",
    fallback: "gemini-2.0-flash",
    swahiliOptimized: "sartifyllc/Pawa-Gemma-Swahili-2B",
  },

  // RAG (Retrieval-Augmented Generation) configuration
  rag: {
    enabled: true,
    sources: [
      "curriculum_data", // From src/curriculum/*.ts
      "huggingface_datasets", // From Hugging Face
      "teacher_materials", // From Classroom Compass
    ],
    retrievalStrategy: "semantic_similarity",
    maxContextLength: 4096,
  },

  // Evaluation metrics
  evaluationMetrics: {
    studentEngagement: "Track interaction frequency and depth",
    learningOutcomes: "Measure progress against CBC learning outcomes",
    teacherSatisfaction: "Gather feedback on tool usefulness",
    ContentRelevance: "Ensure curriculum alignment",
  },
};

// Export types for TypeScript support
export type DifyAgentConfig = typeof difyAgentConfig;
export type Capability = keyof typeof difyAgentConfig.capabilities;
export type Dataset = typeof difyAgentConfig.datasets[0];
