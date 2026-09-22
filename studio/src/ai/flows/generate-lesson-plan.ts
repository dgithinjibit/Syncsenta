
'use server';

/**
 * @fileOverview AI agent to generate a draft lesson plan from a prompt, optionally using a Scheme of Work as context.
 *
 * - generateLessonPlan - A function that handles the lesson plan generation process.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateLessonPlanInput,
    GenerateLessonPlanInputSchema,
    GenerateLessonPlanOutput,
    GenerateLessonPlanOutputSchema
} from './generate-lesson-plan-types';
import { getOmegaClawTeacherCurriculumContext } from '@/curriculum/omega-claw-ai-blockchain';

export type { GenerateLessonPlanInput } from './generate-lesson-plan-types';

export async function generateLessonPlan(
  input: GenerateLessonPlanInput,
  onUpdate: (chunk: string) => void
): Promise<void> {
    const curriculumContext = input.omegaClawCurriculumContext || getOmegaClawTeacherCurriculumContext(input.gradeLevel, input.subject, input.topic);
    const generationInput = curriculumContext
      ? { ...input, omegaClawCurriculumContext: curriculumContext }
      : input;

    const generation = prompt.stream(generationInput);
    for await (const chunk of generation.stream) {
      if (chunk.text) onUpdate(chunk.text);
    }
    await generation.response;
}

const prompt = ai.definePrompt({
    name: 'generateLessonPlanPrompt',
    input: {schema: GenerateLessonPlanInputSchema},
    output: {schema: GenerateLessonPlanOutputSchema},
    prompt: `You are an expert Kenyan CBE curriculum developer, tasked with creating a functional and detailed lesson plan document.

    {{#if schemeOfWorkContext}}
    ---
    **CONTEXT: SCHEME OF WORK**
    You MUST use the following Scheme of Work as the primary source of truth to create the lesson plan document.
    {{{schemeOfWorkContext}}}
    ---
    {{/if}}

    {{#if omegaClawCurriculumContext}}
    ---
    **CONTEXT: OMEGA CLAW CURRICULUM**
    Use this as a mandatory scope and safety guide. Preserve the learner-stage depth, learning outcomes, practical boundaries, and human-review requirements. Do not introduce advanced Senior School content to Grade 6, and do not generate content for grades below Grade 6.
    {{{omegaClawCurriculumContext}}}
    ---
    {{/if}}

    **CRITICAL FORMATTING INSTRUCTIONS:**
    The final output MUST be a well-structured document. Do NOT use Markdown tables.
    Use Markdown headings (##), bold text, and bullet points (-) for structure.

    ## Administrative Details
    - **School:** {{#if school}}{{school}}{{else}}Grace View Primary School{{/if}}
    - **Year:** {{#if year}}{{year}}{{else}}2025{{/if}}
    - **Term:** {{#if term}}{{term}}{{else}}2{{/if}}
    - **Roll:** {{#if roll}}{{roll}}{{else}}Boys: 20, Girls: 20{{/if}}
    - **Teacher:** {{#if teacherName}}{{teacherName}}{{else}}Daniel{{/if}}
    - **Subject:** {{subject}}
    - **Date:** {{current_date format="DD/MM/YYYY"}}
    - **Time:** 45 Minutes

    ## Lesson Details
    - **Strand:** {{#if strand}}{{strand}}{{else}}[Extract from Scheme]{{/if}}
    - **Sub Strand:** {{#if subStrand}}{{subStrand}}{{else}}[Extract from Scheme]{{/if}}
    - **Learning Outcomes:** By the end of the lesson, the learner should be able to:
        - {{#if schemeOfWorkContext}}Extract and list ALL the specific learning outcomes from the provided scheme of work.{{else}}{{{learningObjectives}}}{{/if}}
    - **Key Inquiry Question(s):**
        - {{#if schemeOfWorkContext}}Extract and list ALL the key inquiry questions from the scheme.{{else}}Generate 1-2 relevant inquiry questions for the topic.{{/if}}

    ## Learning Resources
    - {{#if schemeOfWorkContext}}Extract and list ALL the learning resources mentioned in the scheme.{{else}}Suggest relevant learning resources for the topic.{{/if}}

    ## Organization of Learning

    ### Introduction (5 Minutes)
    - **Learner is guided to:** engage in a brief, interactive activity related to "{{topic}}". For example, a quick poll, a think-pair-share question, or watching a short, relevant video clip to spark curiosity.

    ### Lesson Development (25 Minutes)
    - **Learner is guided to:** participate in the first core activity based on the 'Suggested Learning Experiences' from the scheme. This should be a practical, hands-on task. (e.g., "in groups, collect and prepare locally available materials...").
    - **Learner is guided to:** collaborate with peers on a second activity that builds upon the first. This step should involve discussion, creation, or problem-solving. (e.g., "practice the skill of... in pairs", "assemble tools and materials...").
    - **Learner is guided to:** present or share their work from the previous step. This could be a gallery walk, a short group presentation, or a demonstration of the skill learned.

    ### Conclusion (5 Minutes)
    - **Learner is guided to:** summarize the main takeaways of the lesson by answering the Key Inquiry Question(s) and share what they found most interesting or challenging.

    ## Extended Activity
    - **Learner is guided to:** undertake a simple, creative, and relevant take-home activity that reinforces the lesson's outcomes.

    ## Teacher's Reflection
    - [This section MUST be left blank for the teacher to fill in after the lesson.]`,
});
