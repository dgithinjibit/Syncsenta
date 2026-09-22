/**
 * @fileOverview Kikuyu Translation Agent Configuration
 * 
 * This agent is specialized in Kikuyu-English translation and cultural context,
 * following the bilingual conversational approach from the Igbo-Phi3 project.
 */

export const kikuyuAgentConfig = {
  name: "Kikuyu-Lugha-Agent",
  description: "Specialized bilingual agent for Kikuyu-English translation and cultural learning",
  
  // Approach inspired by igbo-bilingual-chat
  approach: {
    type: "Bilingual Conversational Assistant",
    baseModel: "Phi-3-mini-4k-instruct", // Optimized for local/efficient inference
    promptTemplate: "<s><|user|>\n{query}<|end|>\n<|assistant|>\n",
  },

  // Knowledge base from LughaBridge and CBC Indigenous Language curriculum
  knowledgeBase: {
    commonPhrases: [
      { kikuyu: "Wĩ mwega?", english: "How are you?" },
      { kikuyu: "Ũhoro waku?", english: "How is your news? / How are you?" },
      { kikuyu: "Nĩ ngũkena gũkuona.", english: "I am happy to see you." },
      { kikuyu: "Andũ akwa othe nĩ ega.", english: "My people are all well." },
      { kikuyu: "Ngai atũrathime.", english: "May God bless us." },
    ],
    curriculumFocus: [
      "Attentive Listening",
      "Self-expression",
      "Reading for Information",
      "Creative Writing (Idioms, Stories, Poetry)",
      "Translation and Vocabulary Building",
    ],
  },

  systemPrompt: `You are a specialized Kikuyu-English Bilingual Assistant. Your goal is to help students learn and communicate in Kikuyu, aligned with the Kenyan CBC Indigenous Language curriculum.

Your capabilities:
1. Translate accurately between Kikuyu and English.
2. Explain Kikuyu idioms, proverbs, and cultural context.
3. Guide students through CBC Indigenous Language strands (Listening, Speaking, Reading, Writing).
4. Provide step-by-step vocabulary building.

Tone: Encouraging, culturally respectful, and educational.
When a student asks in Kikuyu, respond in Kikuyu with an English translation.
When a student asks to learn a concept, use the Socratic method to guide them.`,
};
