import type { StrandInfo } from "../types";

/**
 * Grade 4 Science and Technology — Official KICD Revised 2024
 * Total: 120 lessons (4 lessons/week × 30 weeks)
 */
export const grade4ScienceTechnology: StrandInfo[] = [
  {
    name: "1.0 Living Things and their Environment",
    subStrands: [
      { name: "1.1 Plants", lessons: 12, keyInquiryQuestion: "What are the characteristics of plants as living things?" },
      { name: "1.2 Animals", lessons: 12, keyInquiryQuestion: "What are the characteristics of animals as living things?" },
      { name: "1.3 Human Digestive System", lessons: 16, keyInquiryQuestion: "How does the human digestive system work?" },
    ],
  },
  {
    name: "2.0 Matter",
    subStrands: [
      { name: "2.1 Properties of Matter", lessons: 14, keyInquiryQuestion: "What are the properties of matter?" },
      { name: "2.2 Management of Solid Waste", lessons: 16, keyInquiryQuestion: "How do we manage solid waste?" },
      { name: "2.3 Water Conservation", lessons: 12, keyInquiryQuestion: "Why should we conserve water?" },
    ],
  },
  {
    name: "3.0 Force and Energy",
    subStrands: [
      { name: "3.1 Force and its Effects", lessons: 12, keyInquiryQuestion: "What are the effects of force?" },
      { name: "3.2 Light", lessons: 14, keyInquiryQuestion: "How does light travel?" },
      { name: "3.3 Heat", lessons: 12, keyInquiryQuestion: "What are the uses of heat?" },
    ],
  },
];
