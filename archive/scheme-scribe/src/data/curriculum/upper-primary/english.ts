import type { StrandInfo } from "../types";

/**
 * Grade 4 English Language — Official KICD Revised 2024
 * Organized by the 4 main strands with sub-strands and lesson allocations
 * from the Summary of Strands and Sub-Strands table.
 * Total: 150 lessons (5 lessons/week × 30 weeks)
 */
export const grade4English: StrandInfo[] = [
  {
    name: "Listening and Speaking",
    subStrands: [
      {
        name: "Pronunciation and Vocabulary",
        lessons: 35,
        learningOutcomes: [
          "pronounce words and sounds correctly and accurately",
          "use vocabulary related to given themes in a variety of contexts",
          "participate actively in two-way conversations (turn-taking)",
          "apply facial expressions and gestures appropriately while speaking",
          "promote the skill of listening intensively to a variety of texts",
        ],
        keyInquiryQuestion: "Why should we pronounce sounds and words correctly?",
      },
    ],
  },
  {
    name: "Reading",
    subStrands: [
      {
        name: "Extensive Reading",
        lessons: 12,
        learningOutcomes: [
          "read a variety of materials (narratives, poems, graded readers) for lifelong learning",
          "demonstrate independent reading of a variety of materials for enjoyment",
          "realise the importance of independent reading in a variety of contexts",
        ],
        keyInquiryQuestion: "Why should we read different types of materials?",
      },
      {
        name: "Intensive Reading",
        lessons: 24,
        learningOutcomes: [
          "read a variety of texts related to themes for comprehension",
          "apply appropriate intensive reading skills to obtain specific factual and inferential information",
          "locate new words and sentence structures in texts",
          "apply basic stress and rhythm when reading poems, songs or passages",
        ],
        keyInquiryQuestion: "How can we obtain information from texts?",
      },
      {
        name: "Fluency",
        lessons: 3,
        learningOutcomes: [
          "read aloud grade-appropriate texts fluently and with expression",
          "apply reading strategies to enhance reading fluency",
          "adopt fluent reading in day-to-day communication",
        ],
        keyInquiryQuestion: "Why is it important to read fluently?",
      },
    ],
  },
  {
    name: "Language Use",
    subStrands: [
      {
        name: "Word Classes",
        lessons: 33,
        learningOutcomes: [
          "identify and use nouns, verbs, adjectives, determiners and prepositions correctly",
          "use quantifiers (much, many, some, any) correctly with nouns",
          "identify present and past progressive forms of the verb",
          "use the present perfect and past perfect aspect correctly in sentences",
          "use prepositions of position and direction in sentences",
        ],
        keyInquiryQuestion: "Why is it important to use correct grammar in communication?",
      },
      {
        name: "Language Patterns",
        lessons: 6,
        learningOutcomes: [
          "use language patterns correctly for effective oral communication",
          "construct sentences using given language patterns",
          "promote the use of correct language patterns in communication",
        ],
        keyInquiryQuestion: "How do language patterns help us communicate?",
      },
    ],
  },
  {
    name: "Writing",
    subStrands: [
      {
        name: "Creative Writing",
        lessons: 15,
        learningOutcomes: [
          "describe the parts of a narrative composition in preparation for writing",
          "organise thoughts fluently, clearly and precisely in a coherent paragraph",
          "create a narrative composition of about 60-80 words",
          "write pictorial compositions of about 60-80 words on given themes",
          "use similes to make compositions interesting",
        ],
        keyInquiryQuestion: "How can you write an interesting composition?",
      },
      {
        name: "Functional Writing",
        lessons: 6,
        learningOutcomes: [
          "identify the components of functional texts (lists, invitations, messages)",
          "write functional texts in the right format for effective communication",
          "adopt the use of functional writing in day-to-day lives",
        ],
        keyInquiryQuestion: "Why do we write functional texts?",
      },
      {
        name: "Mechanics of Writing",
        lessons: 13,
        learningOutcomes: [
          "identify commonly used punctuation marks in written texts",
          "use full stops, capital letters and other punctuation marks correctly",
          "spell words with double consonants correctly",
          "construct correct sentences using words with double consonants",
          "promote the use of punctuation marks for writing fluency",
        ],
        keyInquiryQuestion: "Why do you use punctuation marks?",
      },
      {
        name: "Guided Compositions",
        lessons: 3,
        learningOutcomes: [
          "identify the components of a diary for effective writing",
          "write a diary in the right format for effective communication",
          "adopt the use of diaries in day-to-day lives",
        ],
        keyInquiryQuestion: "Why should we keep a record of what we do?",
      },
    ],
  },
];

/**
 * Grade 5 English Language — Official KICD Revised 2024
 * Total: 150 lessons (5 lessons/week × 30 weeks)
 */
export const grade5English: StrandInfo[] = [
  {
    name: "Listening and Speaking",
    subStrands: [
      { name: "Listening Comprehension", lessons: 5, keyInquiryQuestion: "Why should you listen keenly?" },
      { name: "Pronunciation and Vocabulary", lessons: 30, keyInquiryQuestion: "Why should we pronounce sounds and words correctly?" },
      { name: "Speaking Fluency", lessons: 3, keyInquiryQuestion: "How can you speak fluently and confidently?" },
    ],
  },
  {
    name: "Reading",
    subStrands: [
      { name: "Extensive Reading", lessons: 12, keyInquiryQuestion: "Why should we read different types of materials?" },
      { name: "Intensive Reading", lessons: 24, keyInquiryQuestion: "How can we obtain information from texts?" },
      { name: "Fluency", lessons: 3, keyInquiryQuestion: "Why is it important to read fluently?" },
    ],
  },
  {
    name: "Grammar in Use",
    subStrands: [
      { name: "Word Classes", lessons: 26, keyInquiryQuestion: "Why is it important to use correct grammar?" },
      { name: "Language Patterns", lessons: 9, keyInquiryQuestion: "How do language patterns help us communicate?" },
      { name: "Tense", lessons: 2, keyInquiryQuestion: "Why is it important to show when something happened?" },
    ],
  },
  {
    name: "Writing",
    subStrands: [
      { name: "Creative Writing", lessons: 15, keyInquiryQuestion: "How can you write an interesting composition?" },
      { name: "Functional Writing", lessons: 8, keyInquiryQuestion: "Why do we write functional texts?" },
      { name: "Mechanics of Writing", lessons: 13, keyInquiryQuestion: "Why do you use punctuation marks?" },
    ],
  },
];

/**
 * Grade 6 English Language — Official KICD Revised 2024
 * Total: 150 lessons (5 lessons/week × 30 weeks)
 */
export const grade6English: StrandInfo[] = [
  {
    name: "Listening and Speaking",
    subStrands: [
      { name: "Pronunciation and Vocabulary", lessons: 39, keyInquiryQuestion: "Why should we pronounce sounds and words correctly?" },
    ],
  },
  {
    name: "Reading",
    subStrands: [
      { name: "Extensive Reading", lessons: 11, keyInquiryQuestion: "Why should we read a variety of materials?" },
      { name: "Intensive Reading", lessons: 22, keyInquiryQuestion: "How can we obtain information from texts?" },
      { name: "Fluency", lessons: 3, keyInquiryQuestion: "Why is it important to read fluently?" },
    ],
  },
  {
    name: "Language Use",
    subStrands: [
      { name: "Word Classes", lessons: 33, keyInquiryQuestion: "Why is it important to use correct grammar?" },
      { name: "Tenses", lessons: 6, keyInquiryQuestion: "Why is it important to show when something happened?" },
    ],
  },
  {
    name: "Writing",
    subStrands: [
      { name: "Creative Writing", lessons: 14, keyInquiryQuestion: "How can you make your writing interesting?" },
      { name: "Functional Writing", lessons: 6, keyInquiryQuestion: "Why do we write functional texts?" },
      { name: "Mechanics of Writing", lessons: 13, keyInquiryQuestion: "Why do you use punctuation marks?" },
      { name: "Guided Compositions", lessons: 3, keyInquiryQuestion: "Why should we keep a record of what we do?" },
    ],
  },
];
