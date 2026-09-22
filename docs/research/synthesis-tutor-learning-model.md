# Synthesis Tutor learning-model research

Research date: September 21, 2026.

## Sources reviewed

1. [Synthesis Tutor official product page](https://www.synthesis.com/tutor)
2. [Synthesis Tutor official educator page](https://www.synthesis.com/educators)
3. [Kestin et al., *Scientific Reports* (2025), AI tutoring outperforms in-class active learning](https://www.nature.com/articles/s41598-025-97652-6)
4. [Harvard Science Education Research Laboratory summary](https://serl.fas.harvard.edu/publication/ai-tutoring-outperforms-class-active-learning-rct-introducing-novel-research-based)

## How Synthesis Tutor presents its work

Synthesis positions Tutor as a personalized, warm, patient, encouraging math companion rather than a generic chatbot. Its public product description says the system adapts to a learner's ability, evaluates performance immediately, surfaces mistakes, targets knowledge gaps, and progresses toward mastery rather than relying on one-time tests. The product is described as covering standard K–5 mathematics and extending beyond the basic curriculum.

The experience is deliberately multisensory and interactive. The official pages describe hands-on activities, manipulatives, visualizations, playful screen-based lessons, and activities that invite learners to take action. The design goal is to make mathematical ideas click through concrete and visual representations before relying on abstract symbols. It also advertises read-aloud support for emerging readers, adjustable voice speed, and accommodations intended to support neurodiverse learners.

A key mechanism is continuous assessment. Synthesis says that micro-assessments appear throughout lessons and that a learner moves forward when they demonstrate understanding of the current material. Wrong answers are treated as instructional evidence: the educator page describes adaptive wrong-answer handling and step-by-step guidance rather than simply revealing an answer and moving on.

The official educator page frames the school product as a teacher multiplier for mixed-ability classes. Its public claims include engaging students at their level, building conceptual foundations, filling skill gaps, freeing class time, and providing actionable progress reports. It presents Tutor as an all-in-one teaching assistant rather than a collection of games and assessments.

Synthesis also explicitly says that it uses AI where appropriate but does not simply outsource teaching to an LLM. Its public FAQ says expert educators and neuroscientists design and review lessons and interactions. This is an important distinction: the product is presented as a controlled learning system with curated experiences, not an open-ended chatbot that invents the curriculum.

## Evidence and limits

The *Scientific Reports* paper studied a custom AI tutor in an undergraduate Harvard physics course, not Synthesis Tutor's K–5 mathematics product. The randomized crossover experiment had N=194 students, used two lessons over consecutive weeks, compared an AI-supported lesson with an in-class active-learning lesson, and measured pre/post learning, time on task, engagement, enjoyment, motivation, and growth mindset. The paper reports higher AI-group post-test scores and more than double the median learning gains relative to the in-class comparison in the study setting. The Harvard research-lab summary reports the same broad conclusion.

This research supports design principles such as targeted content-rich tutoring, timely feedback, active interaction, cognitive-load management, and evidence-based pedagogy. It does not prove that Synthesis Tutor produces the same effects for Kenyan CBC learners, for AI/blockchain topics, for low-connectivity schools, or for younger children. Senta Studio should not reuse the study as an outcome claim; it should run its own pilot with pre/post measures, comparison conditions where appropriate, anonymised data, sample sizes, time windows, and limitations.

## Principles suitable for Senta Studio

- Treat AI as a bounded teaching component inside a curated curriculum workflow, not as the curriculum itself.
- Use a diagnostic and frequent low-stakes checks to identify misconceptions before advancing.
- Handle wrong answers with a progressive hint ladder: prompt thinking, surface the misconception, show a representation, then model a worked example only when needed.
- Move from concrete/local examples to visual representations and then to formal language and symbols.
- Use mastery gates and spaced retrieval rather than one final quiz.
- Give teachers concise, actionable reports: current skill, evidence, misconception, recommended next activity, and confidence/uncertainty.
- Keep parents informed through plain-language progress summaries without exposing unnecessary learner data.
- Make accessibility and low-bandwidth alternatives first-class: text, print, audio where consented, downloadable activities, and offline review.
- Keep teacher approval and human accountability in the loop for generated lessons, especially for minors and high-impact decisions.
- Measure outcomes locally before making effectiveness claims.

## Senta Studio adaptation boundary

Synthesis Tutor is focused publicly on K–5 mathematics. Senta Studio's target is broader: Kenyan CBC teacher workflows, Grade 6 introductory AI/blockchain learning, and deeper Senior School work. Therefore, Senta Studio should borrow the learning mechanisms, not copy the product scope, branding, content, UI, or proprietary implementation.

## Video observation: official demo

The official product page's “See a real lesson in action” video links to the public YouTube video [wlrpxyCKGSU](https://www.youtube.com/watch?v=wlrpxyCKGSU). Direct YouTube playback was rate-limited in the browser session, so the public URL was analyzed with the video-analysis utility. The following interaction details are observations from the video analysis, not claims about hidden implementation.

The child is greeted by name and moves through several interactive math experiences rather than a single chat screen. Demonstrated activities include place-value construction using dots and plus/minus controls, multiplication on visual grids, square-number patterns, a row-and-column tile-sum puzzle, fraction tiles dragged into a whole, an Ancient Egypt themed numeral activity, flashcard recall, and multi-digit addition with carrying.

The learner answers through multiple modalities: clicking individual dots, entering numbers in text or a visible number pad, dragging and dropping fraction tiles, grouping objects, and incrementally adjusting quantities. Visual feedback includes highlighted selections, glowing or coloured states, grid intersections, progress bars, question counts, and trophy counters. Correct answers produce positive verbal feedback and celebratory confetti.

The tutor voice provides short guidance and encouragement during the task. The observed feedback includes reinforcement such as “Well done!” and “Great work,” plus step-oriented explanations around fractions and carrying. The video shows scaffolding and guided activity, but it does not reveal the exact internal decision rule used to detect that a child is stuck.

The observed product pattern is therefore: greet and orient the learner, present one manipulable concept, let the child act directly, give immediate visual/audio feedback, celebrate progress, and continue through a bounded round. This is materially different from asking a child to type into an open-ended AI chat.

## Implications for Omega Claw

Omega Claw should use task-first interactions for Grade 6 AI/blockchain introduction and for Senior School depth:

- **Data and AI:** let learners classify examples, move data cards through an input-process-output model, adjust a simple rule, and explain the result.
- **Blockchain:** let learners place transaction cards into a shared block, connect blocks in order, compare copies of a class ledger, and test what happens when one record changes.
- **Cyber-safety and ethics:** let learners sort safe/unsafe scenarios, choose a response, and explain the consequence rather than receiving a long lecture.
- **Assessment:** make each activity a bounded round with visible progress, one concept at a time, an attempt counter, and a short mastery check.
- **Feedback:** use brief voice/text guidance, visual highlighting, misconception-specific hints, and a celebration that does not shame mistakes.
- **Low bandwidth:** provide text-first and printable equivalents for every interactive activity; treat audio and animation as optional enhancements.
- **Teacher evidence:** record the concept attempted, response, hint level, misconception category, mastery result, and recommended follow-up rather than only recording a score.

Senta Studio should borrow the interaction grammar—manipulate, observe, explain, retry, master—not Synthesis’s branding, content, assets, or proprietary implementation.
