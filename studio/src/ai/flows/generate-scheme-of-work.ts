'use server';

/**
 * @fileOverview AI agent to generate a draft Scheme of Work based on official curriculum data.
 * 
 * - generateSchemeOfWork - A function that handles the scheme of work generation process.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateSchemeOfWorkInput,
    GenerateSchemeOfWorkInputSchema,
    GenerateSchemeOfWorkOutput,
    GenerateSchemeOfWorkOutputSchema
} from './generate-scheme-of-work-types';
import { getOmegaClawTeacherCurriculumContext } from '@/curriculum/omega-claw-ai-blockchain';

export type { GenerateSchemeOfWorkInput } from './generate-scheme-of-work-types';


export async function generateSchemeOfWork(
  input: GenerateSchemeOfWorkInput
): Promise<GenerateSchemeOfWorkOutput> {
  return generateSchemeOfWorkFlow(input);
}


const generateSchemeOfWorkFlow = ai.defineFlow(
  {
    name: 'generateSchemeOfWorkFlow',
    inputSchema: GenerateSchemeOfWorkInputSchema,
    outputSchema: GenerateSchemeOfWorkOutputSchema,
  },
  async (input) => {
    const curriculumContext = input.omegaClawCurriculumContext || getOmegaClawTeacherCurriculumContext(input.grade, input.subject, `${input.strand} ${input.subStrand}`);
    const generationInput = curriculumContext
      ? { ...input, omegaClawCurriculumContext: curriculumContext }
      : input;
    
    // Determine which prompt to use based on the subject
    const isKiswahili = input.subject.toLowerCase().includes('kiswahili');

    const kiswahiliPrompt = `You are an expert curriculum developer in Kenya, creating a CBE-compliant Scheme of Work.

{{#if omegaClawCurriculumContext}}
**MUKTADHA WA MTAALA WA OMEGA CLAW:**
Tumia huu kama mwongozo wa lazima wa kiwango na usalama. Hifadhi kina cha darasa, matokeo ya kujifunza, mipaka ya vitendo, na mahitaji ya ukaguzi wa mwalimu. Usilete maudhui ya kina ya Senior School kwa Grade 6, wala maudhui ya AI/blockchain kwa madarasa yaliyo chini ya Grade 6.
{{{omegaClawCurriculumContext}}}
{{/if}}

Your task is to generate a scheme of work for a specific sub-strand, based on the provided curriculum data. The entire output must be a single, well-formatted Markdown table.

**CONTEXT FROM CURRICULUM DOCUMENT (Your ONLY Source of Truth):**
You MUST use the following curriculum details to populate the table.
- **Subject:** {{{subject}}}
- **Grade:** {{{grade}}}
- **Strand:** {{{strand}}}
- **Sub Strand:** {{{subStrand}}}
- **Total Lessons for this Sub-Strand:** {{{lessonsPerWeek}}}
- **Curriculum Details:** {{{schemeOfWorkContext}}}

**CRITICAL FORMATTING INSTRUCTIONS (KISWAHILI):**
The final output MUST be a single, well-formatted Markdown table with the following columns. Do NOT add any text or summaries outside of the table. Do NOT use any HTML tags like <br>. For lists within a cell, ensure each item is on a new line and starts with a hyphen (-).

| Mada (Strand) | Mada Ndogo (Sub Strand) & Vipindi | Matokeo Maalum Yanayotarajiwa (Specific Learning Outcomes) | Shughuli za Ujifunzaji Zilizopendekezwa (Suggested Learning Experiences) | Swali Dadisi Lililopendekezwa (Key Inquiry Question(s)) |
| :--- | :--- | :--- | :--- | :--- |
| **{{{strand}}}** | **{{{subStrand}}}** (Vipindi {{{lessonsPerWeek}}}) | - [Extract and list ALL the learning outcomes from the curriculum details here.] | - [Extract and list ALL the suggested learning experiences from the curriculum details here.] | - [Extract and list ALL the key inquiry questions from the curriculum details here.] |
`;

    const englishPrompt = `You are an expert Kenyan CBE curriculum developer. Your task is to generate a comprehensive, single-row Scheme of Work in a Markdown table format.

{{#if omegaClawCurriculumContext}}
**OMEGA CLAW CURRICULUM CONTEXT:**
Use this as a mandatory scope and safety guide. Preserve the learner-stage depth, outcomes, practical boundaries, and human-review requirements. Do not introduce advanced Senior School content to Grade 6, and do not generate AI/blockchain content for grades below Grade 6.
{{{omegaClawCurriculumContext}}}
{{/if}}

**CONTEXT FROM CURRICULUM DOCUMENT (Your ONLY Source of Truth):**
You MUST use the following curriculum details to populate the table. Do not add any information not present in this context.
- **Subject:** {{{subject}}}
- **Grade:** {{{grade}}}
- **Strand:** {{{strand}}}
- **Sub Strand:** {{{subStrand}}}
- **Total Lessons for this Sub-Strand:** {{{lessonsPerWeek}}}
- **Curriculum Details:** {{{schemeOfWorkContext}}}

**CRITICAL FORMATTING INSTRUCTIONS:**
The final output MUST be a single, well-formatted Markdown table with the following columns. Ensure that all data from the "Curriculum Details" is correctly placed into the corresponding columns of the table. For lists within a cell, ensure each item is on a new line and starts with a hyphen (-).

| Strand | Sub Strand (Lessons) | Specific Learning Outcomes | Suggested Learning Experiences | Key Inquiry Question(s) | Core Competencies | Values | Pertinent and Contemporary Issues (PCIs) | Link to other subjects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **{{{strand}}}** | **{{{subStrand}}}** ({{{lessonsPerWeek}}} lessons) | [Extract and list ALL 'learning_outcomes' here.] | [Extract and list ALL 'suggested_activities' here.] | [Extract and list ALL 'key_inquiry_questions' here.] | [Extract and list ALL 'core_competencies' here.] | [Extract and list ALL 'values' here.] | [Extract and list ALL 'pcis' here.] | [Extract and list ALL 'links_to_other_subjects' here.] |
`;

    const selectedPrompt = ai.definePrompt({
        name: 'generateSchemeOfWorkPrompt',
        input: {schema: GenerateSchemeOfWorkInputSchema},
        output: {schema: GenerateSchemeOfWorkOutputSchema},
        prompt: isKiswahili ? kiswahiliPrompt : englishPrompt,
    });


        const {output} = await selectedPrompt(generationInput);
    return output!;
  }
);
