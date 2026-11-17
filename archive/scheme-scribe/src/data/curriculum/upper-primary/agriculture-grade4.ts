import type { StrandInfo } from "../types";

/**
 * Grade 4 Agriculture — Official KICD Revised 2024
 * Total: 120 lessons (4 lessons/week × 30 weeks)
 */
export const grade4Agriculture: StrandInfo[] = [
  {
    name: "1.0 Conservation of Resources",
    subStrands: [
      { name: "1.1 Soil Conservation", lessons: 7, keyInquiryQuestion: "How can composting conserve the environment?" },
      { name: "1.2 Water Conservation", lessons: 7, keyInquiryQuestion: "Why should we conserve water?" },
      { name: "1.3 Fuel Conservation", lessons: 7, keyInquiryQuestion: "Why should we conserve fuel?" },
      { name: "1.4 Conserving Wild Animals", lessons: 8, keyInquiryQuestion: "Why should we conserve wild animals?" },
    ],
  },
  {
    name: "2.0 Food Production Processes",
    subStrands: [
      { name: "2.1 Direct Sowing of Tiny Seeds", lessons: 8, keyInquiryQuestion: "How do you sow tiny seeds?" },
      { name: "2.2 Growing Fruits", lessons: 16, keyInquiryQuestion: "How do you grow fruit trees?" },
      { name: "2.3 Uses of Domestic Animals", lessons: 8, keyInquiryQuestion: "How are domestic animals useful?" },
      { name: "2.4 Balanced Meal", lessons: 9, keyInquiryQuestion: "Why should we eat a balanced meal?" },
      { name: "2.5 Cooking Food", lessons: 11, keyInquiryQuestion: "How do you cook food safely?" },
    ],
  },
  {
    name: "3.0 Hygiene Practices",
    subStrands: [
      { name: "3.1 Personal Hygiene", lessons: 10, keyInquiryQuestion: "Why is personal hygiene important?" },
      { name: "3.2 Domestic Hygiene", lessons: 9, keyInquiryQuestion: "How do you maintain domestic hygiene?" },
      { name: "3.3 Cleaning Personal Protective Equipment", lessons: 9, keyInquiryQuestion: "Why should we clean PPE?" },
    ],
  },
  {
    name: "4.0 Production Techniques",
    subStrands: [
      { name: "4.1 Making Tacking Stitches", lessons: 11, keyInquiryQuestion: "How do you make tacking stitches?" },
    ],
  },
];
