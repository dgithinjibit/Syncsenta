import type { StrandInfo, SubStrandInfo } from "../types";

/**
 * AI Literacy (Artificial Intelligence) Learning Area
 * Kenyan CBE-aligned design, Grades 4-12.
 *
 * Sources blended into this design:
 *  - "A Strategic Framework for an AI Education Model in the Kenyan CBE" (Daniel Wachira)
 *  - UNESCO AI Competency Framework for Students (2024): human-centred mindset,
 *    ethics of AI, AI techniques and applications, AI system design x
 *    Understand / Apply / Create progression levels.
 *  - China MOE "Guide to General AI Education in Primary and Secondary Schools (2025)":
 *    tiered progression — primary = experience, junior = technical logic,
 *    senior = model building, systems thinking and social responsibility.
 *
 * Every sub-strand carries official-style learning outcomes written in the rigid
 * KSA order required by this project: a) Knowledge, b) Skills, c) Attitudes.
 */

const STRAND_NAMES = [
  "1.0 Foundations of Intelligence",
  "2.0 Data and Representation",
  "3.0 AI Techniques and Programming",
  "4.0 AI System Design and Projects",
  "5.0 Ethics, Society and AI Policy",
] as const;

function ss(
  name: string,
  lessons: number,
  keyInquiryQuestion: string,
  learningOutcomes: string[],
  suggestedExperiences: string[],
): SubStrandInfo {
  return { name, lessons, keyInquiryQuestion, learningOutcomes, suggestedExperiences };
}

function build(subs: SubStrandInfo[][]): StrandInfo[] {
  return STRAND_NAMES.map((name, i) => ({ name, subStrands: subs[i] }));
}

// ─────────────────────────────────────────────────────────────
// UPPER PRIMARY (Grade 6 only) — 2 lessons/week, 66 lessons
// Introductory level: recognising AI around us, simple data ideas,
// safe and honest use. No programming, no model building.
// ─────────────────────────────────────────────────────────────

export const grade6AI: StrandInfo[] = build([
  [
    ss("1.1 What is Intelligence?", 4, "How do we know that something is intelligent?", [
      "identify examples of intelligent behaviour in people, animals and machines",
      "sort everyday objects into those that behave intelligently and those that do not",
      "appreciate intelligence found in living things and in machines",
    ], [
      "Learners name intelligent things they see at home and in school",
      "Learners sort picture cards into intelligent and not intelligent",
      "Learners discuss in groups why they placed each card where they did",
    ]),
    ss("1.2 Meaning of Artificial Intelligence", 4, "What does it mean to say a machine is intelligent?", [
      "state the meaning of artificial intelligence in simple terms",
      "describe simple examples of artificial intelligence in daily life",
      "show interest in learning about artificial intelligence",
    ], [
      "Learners listen to a simple explanation of artificial intelligence",
      "Learners describe an intelligent machine they have seen or used",
      "Learners draw a chart of intelligent machines in their community",
    ]),
    ss("1.3 Artificial Intelligence Around Us in Kenya", 4, "Where do we meet artificial intelligence in our community?", [
      "identify uses of artificial intelligence in Kenyan homes, farms, hospitals and phones",
      "match everyday services to the intelligent technology used in them",
      "appreciate the usefulness of artificial intelligence in daily Kenyan life",
    ], [
      "Learners list phone and mobile-money features that suggest answers to users",
      "Learners match pictures of services to the intelligent tools used",
      "Learners share stories of intelligent technology used by their families",
    ]),
  ],
  [
    ss("2.1 Meaning and Sources of Data", 5, "What is data and where does it come from?", [
      "state the meaning of data and name common sources of data",
      "collect simple data from classmates using a prepared form",
      "value accuracy when collecting data",
    ], [
      "Learners name types of data such as numbers, words, pictures and sounds",
      "Learners collect class data such as favourite fruits or shoe sizes",
      "Learners record their findings neatly in a table",
    ]),
    ss("2.2 Sorting and Grouping Data", 5, "Why do we group information before using it?", [
      "explain why data is sorted and grouped before use",
      "sort picture or number cards into labelled groups",
      "show care and orderliness when organising data",
    ], [
      "Learners sort picture cards of animals, fruits or vehicles into groups",
      "Learners label each group and count the items in it",
      "Learners present their grouped data to the class",
    ]),
  ],
  [
    ss("3.1 Machines Follow Instructions", 4, "How does a machine know what to do?", [
      "explain that machines follow step-by-step instructions given by people",
      "arrange picture steps into the correct order for a simple task",
      "appreciate the importance of clear and correct instructions",
    ], [
      "Learners give a classmate spoken step-by-step instructions for a task",
      "Learners arrange instruction cards in order for a daily activity",
      "Learners discuss what happens when a step is missing",
    ]),
    ss("3.2 Teaching a Machine by Example", 4, "How can a machine learn from examples?", [
      "describe how machines learn from many examples shown to them",
      "demonstrate teaching a machine by grouping example pictures",
      "appreciate the role of good examples in machine learning",
    ], [
      "Learners play a guided game where the teacher guesses using examples",
      "Learners group example pictures into two classes and test the guessing",
      "Learners discuss why more examples give better guesses",
    ]),
    ss("3.3 Talking and Listening Machines", 4, "How do machines understand what we say?", [
      "identify machines that respond to speech and to typed questions",
      "demonstrate use of a voice or text assistant to ask a simple question",
      "value polite and responsible use of talking machines",
    ], [
      "Learners observe a demonstration of a voice assistant answering a question",
      "Learners take turns asking clear questions and record the answers",
      "Learners discuss when the machine answered wrongly and why",
    ]),
  ],
  [
    ss("4.1 Spotting Problems Artificial Intelligence Can Help Solve", 5, "Which everyday problems could an intelligent machine help with?", [
      "identify problems in the school or community that intelligent tools could help solve",
      "describe a simple idea for using an intelligent tool to solve one problem",
      "appreciate teamwork when looking for solutions to problems",
    ], [
      "Learners list problems they notice in school such as lost items or litter",
      "Learners choose one problem and describe an intelligent helper for it",
      "Learners share their ideas in groups and give feedback to one another",
    ]),
    ss("4.2 Simple Class Project", 5, "How can we show our idea to others?", [
      "describe the parts of their chosen artificial intelligence idea",
      "prepare a drawing, poster or role-play showing how the idea would work",
      "show confidence in presenting their own ideas to others",
    ], [
      "Learners prepare posters or role-plays of their intelligent helper",
      "Learners present the idea to the class and answer questions",
      "Learners display the best posters in the classroom or school notice board",
    ]),
  ],
  [
    ss("5.1 Safe Use of Intelligent Tools", 6, "How do we stay safe when using intelligent tools?", [
      "identify safe and unsafe behaviour when using online intelligent tools",
      "demonstrate safe use of an intelligent tool under supervision",
      "value personal safety when using digital tools",
    ], [
      "Learners list safety rules for using phones and computers",
      "Learners role-play safe and unsafe situations online",
      "Learners prepare a class safety chart and display it",
    ]),
    ss("5.2 Honesty When Using Artificial Intelligence", 6, "Is it honest to present a machine's work as our own?", [
      "explain why work produced by a machine must be acknowledged",
      "demonstrate acknowledging help received from an intelligent tool",
      "commit to honesty in schoolwork",
    ], [
      "Learners discuss a story about a learner who copied a machine's answer",
      "Learners practise writing a short note stating where help came from",
      "Learners agree on a class rule on honest use of intelligent tools",
    ]),
    ss("5.3 Keeping Personal Information Private", 5, "Which information should we never share with a machine?", [
      "identify personal information that should not be shared online",
      "sort information cards into private and shareable",
      "show respect for the privacy of self and others",
    ], [
      "Learners name items of personal information such as names and locations",
      "Learners sort information cards into private and shareable groups",
      "Learners discuss how to respond when asked for private information",
    ]),
    ss("5.4 Artificial Intelligence and Our Future Work", 5, "How will intelligent machines change the work we do?", [
      "identify jobs in Kenya that intelligent machines are changing",
      "describe skills people will need to work alongside intelligent machines",
      "appreciate the value of learning new skills for the future",
    ], [
      "Learners interview an adult about changes in their work",
      "Learners list skills that machines cannot easily replace",
      "Learners discuss careers they would like in a world with intelligent machines",
    ]),
  ],
]);

// ─────────────────────────────────────────────────────────────
// JUNIOR SCHOOL (Grades 7-9) — 3 lessons/week, 99 lessons
// Emphasis: how machines learn, data handling, project work, bias and ethics
// ─────────────────────────────────────────────────────────────

export const grade7AI: StrandInfo[] = build([
  [
    ss("1.1 Defining Artificial Intelligence", 5, "What makes a system artificially intelligent?", [
      "define artificial intelligence and its main branches",
      "classify given systems into the branches of AI",
      "appreciate the scope of artificial intelligence as a field",
    ], [
      "Learners research definitions of AI from different sources",
      "Learners map systems onto branches such as vision, language and robotics",
      "Learners defend their classification in a class discussion",
    ]),
    ss("1.2 Symbolic and Connectionist Approaches", 5, "Do machines reason with rules or with examples?", [
      "explain the difference between rule-based and learning-based AI",
      "compare a rule-based system with a learning system on the same task",
      "appreciate that different problems need different approaches",
    ], [
      "Learners build a rule-based spam filter on paper",
      "Learners test a trained spam classifier on the same messages",
      "Learners record where each approach succeeded or failed",
    ]),
    ss("1.3 The Road Towards General Intelligence", 5, "How far are we from a machine that can learn anything?", [
      "outline what artificial general intelligence would require",
      "compare current systems against the requirements of general intelligence",
      "value realistic thinking about technology claims",
    ], [
      "Learners read a short article on AI research",
      "Learners build a comparison table of current AI against AI goals",
      "Learners debate timelines claimed in the media",
    ]),
  ],
  [
    ss("2.1 The Data Life Cycle", 6, "What happens to data from collection to use?", [
      "outline the stages of the data life cycle",
      "conduct a small data collection following the life cycle",
      "value integrity at every stage of handling data",
    ], [
      "Learners map the stages from collection to storage to use",
      "Learners collect a class data set following each stage",
      "Learners document what they did at each stage",
    ]),
    ss("2.2 Data Cleaning and Preparation", 6, "Why is most of AI work actually data work?", [
      "explain why data must be prepared before training",
      "practice cleaning, formatting and splitting a data set",
      "show diligence in preparing data carefully",
    ], [
      "Learners clean a supplied messy spreadsheet",
      "Learners split data into training and testing portions",
      "Learners compare model results before and after cleaning",
    ]),
    ss("2.3 Labelling and Annotation", 6, "Who decides what a label means?", [
      "describe how labelling guidelines affect a trained model",
      "practice labelling a shared data set using agreed guidelines",
      "value consistency and honesty when labelling",
    ], [
      "Learners write labelling guidelines as a class",
      "Learners label the same images independently and compare",
      "Learners resolve disagreements and refine the guidelines",
    ]),
  ],
  [
    ss("3.1 Supervised Learning", 6, "How does a machine learn from labelled examples?", [
      "explain the process of supervised learning",
      "practice training a classifier on a labelled data set",
      "appreciate the role of good examples in learning",
    ], [
      "Learners train a classifier using a prepared data set",
      "Learners record accuracy at different training sizes",
      "Learners plot accuracy against number of examples",
    ]),
    ss("3.2 Introduction to Text Programming", 6, "How is text programming different from blocks?", [
      "identify the basic elements of a text-based program",
      "construct short text-based programs using variables and conditions",
      "show perseverance when handling syntax errors",
    ], [
      "Learners translate a block program into text code",
      "Learners write programs that take input and give output",
      "Learners debug error messages in pairs",
    ]),
    ss("3.3 Evaluating a Model", 6, "How do we measure whether a model is good?", [
      "explain accuracy and error in a trained model",
      "interpret the results of a model test",
      "value honest reporting of model performance",
    ], [
      "Learners test a model on unseen data",
      "Learners build a simple results table of correct and wrong answers",
      "Learners explain where the model failed and why",
    ]),
  ],
  [
    ss("4.1 Problem Framing", 5, "Is AI the right tool for this problem?", [
      "state when an AI approach suits a problem and when it does not",
      "examine a set of problems and select those suited to AI",
      "value careful judgement before choosing technology",
    ], [
      "Learners assess problem cards for AI suitability",
      "Learners justify their choices to the class",
      "Learners select one problem for their term project",
    ]),
    ss("4.2 Prototyping", 5, "How do we make a first working version quickly?", [
      "outline the purpose of a prototype",
      "construct a prototype of their chosen solution",
      "show willingness to discard and rebuild ideas",
    ], [
      "Learners build a rough prototype within one lesson",
      "Learners show the prototype to users for comment",
      "Learners rebuild the prototype after feedback",
    ]),
    ss("4.3 Documentation", 5, "How will others understand what we built?", [
      "describe what project documentation should contain",
      "record their project design, data and results",
      "appreciate clear records as part of good work",
    ], [
      "Learners keep a structured project journal",
      "Learners write a short technical description of their solution",
      "Learners exchange documents and check for clarity",
    ]),
  ],
  [
    ss("5.1 Ethical Principles for AI", 8, "What principles should guide anyone who builds AI?", [
      "state the main ethical principles guiding AI use",
      "examine case studies against these principles",
      "commit to ethical conduct in their own projects",
    ], [
      "Learners study principles of fairness, transparency and accountability",
      "Learners analyse case studies in groups",
      "Learners write an ethics statement for their project",
    ]),
    ss("5.2 Algorithmic Bias", 8, "How does bias get into a system that has no feelings?", [
      "explain how bias enters an AI system through data and design",
      "examine a model for biased outcomes",
      "value equity in the systems they build",
    ], [
      "Learners train models on deliberately skewed data",
      "Learners measure outcomes across different groups",
      "Learners propose corrections and retest",
    ]),
    ss("5.3 Data Protection in Kenya", 8, "What does Kenyan law say about our data?", [
      "outline key provisions of the Kenyan data protection framework",
      "interpret a scenario against the requirements of the law",
      "commit to lawful handling of other people's data",
    ], [
      "Learners study simplified provisions of the Data Protection Act",
      "Learners judge scenarios as lawful or unlawful",
      "Learners write a data policy for their class project",
    ]),
    ss("5.4 Junior Capstone Project", 9, "How can we solve a real Kenyan problem with AI?", [
      "describe the full design of their capstone solution",
      "construct, test and document a complete AI project",
      "show responsibility and teamwork throughout the project",
    ], [
      "Learners select a real local problem",
      "Learners run the full design cycle over several weeks",
      "Learners present the project with documentation and ethics statement",
    ]),
  ],
]);

export const grade8AI: StrandInfo[] = build([
  [
    ss("1.1 Search and Problem Solving", 5, "How does a machine find a path to a goal?", [
      "explain how a machine searches for a solution",
      "practice tracing a search through a simple problem space",
      "appreciate systematic thinking in solving problems",
    ], [
      "Learners solve maze problems by hand using search rules",
      "Learners trace breadth-first and depth-first routes",
      "Learners compare the number of steps each route needed",
    ]),
    ss("1.2 Knowledge and Reasoning", 5, "Can a machine draw a conclusion from facts?", [
      "explain how a machine reasons from stored facts",
      "construct simple logical rules that produce a conclusion",
      "value logical consistency in reasoning",
    ], [
      "Learners write facts and rules for a small domain",
      "Learners derive conclusions by applying rules",
      "Learners test rules that produce wrong conclusions",
    ]),
    ss("1.3 Agents and Environments", 5, "What makes a program an agent?", [
      "describe an agent in terms of sensing, deciding and acting",
      "examine a given system and identify its agent parts",
      "appreciate the design thinking behind intelligent agents",
    ], [
      "Learners draw sense-decide-act diagrams for known systems",
      "Learners simulate an agent in a grid world on paper",
      "Learners identify agent parts in a robot or game character",
    ]),
  ],
  [
    ss("2.1 Features and Attributes", 6, "What does a model actually look at?", [
      "explain what features a model uses to make a prediction",
      "select suitable features from a data set for a given task",
      "value thoughtful selection over guessing",
    ], [
      "Learners list possible features for predicting crop yield",
      "Learners test models built on different feature sets",
      "Learners record which features mattered most",
    ]),
    ss("2.2 Data Visualisation", 6, "What can a chart reveal that a table hides?", [
      "explain how different charts reveal different patterns",
      "construct appropriate charts for a given data set",
      "appreciate honesty in presenting data visually",
    ], [
      "Learners produce scatter, bar and line charts of the same data",
      "Learners identify misleading charts and explain why",
      "Learners redraw a misleading chart honestly",
    ]),
    ss("2.3 Knowledge Graphs", 6, "How can relationships between facts be stored?", [
      "describe how a knowledge graph stores entities and relationships",
      "construct a small knowledge graph of a chosen topic",
      "appreciate structure in organising knowledge",
    ], [
      "Learners model Kenyan counties and their products as a graph",
      "Learners write entity-relation statements",
      "Learners query the graph by hand to answer questions",
    ]),
  ],
  [
    ss("3.1 Unsupervised Learning and Clustering", 6, "Can a machine group data without being told the groups?", [
      "explain how clustering groups data without labels",
      "practice clustering a data set and interpreting the groups",
      "value curiosity in exploring unlabelled data",
    ], [
      "Learners cluster class survey data using a free tool",
      "Learners name and describe the clusters found",
      "Learners test whether the clusters make real-world sense",
    ]),
    ss("3.2 Programming Data Pipelines", 6, "How do we move data through a program?", [
      "outline the stages of a simple data pipeline in code",
      "construct a program that reads, processes and outputs data",
      "show orderliness in structuring their code",
    ], [
      "Learners write code that reads a data file",
      "Learners add processing steps and output to the pipeline",
      "Learners refactor the pipeline into reusable functions",
    ]),
    ss("3.3 Introduction to Neural Networks", 6, "How is a neural network different from a set of rules?", [
      "describe the structure of a simple neural network",
      "practice training a small neural network on a prepared data set",
      "appreciate the learning behaviour of neural networks",
    ], [
      "Learners build a paper model of neurons, weights and layers",
      "Learners train a small network in a browser tool",
      "Learners observe how changing layers changes results",
    ]),
  ],
  [
    ss("4.1 Requirements and Constraints", 5, "What limits must our solution work within?", [
      "state the requirements and constraints of a project",
      "examine a context and record its technical and social constraints",
      "value realism in planning solutions",
    ], [
      "Learners audit available devices, data and time",
      "Learners write a constraints list for their project",
      "Learners adjust their project scope to fit the constraints",
    ]),
    ss("4.2 Iterative Development", 5, "Why do we build in small repeated steps?", [
      "explain the value of building in small iterations",
      "construct successive versions of a solution, testing each one",
      "show discipline in working through repeated cycles",
    ], [
      "Learners plan three build cycles with goals for each",
      "Learners complete and test each cycle",
      "Learners record what changed between versions",
    ]),
    ss("4.3 User Testing", 5, "What do real users say about what we built?", [
      "describe methods of testing a solution with users",
      "conduct a user test and record the findings",
      "appreciate criticism as a way to improve",
    ], [
      "Learners prepare user test tasks and questions",
      "Learners observe users without coaching them",
      "Learners rank the problems found and fix the top ones",
    ]),
  ],
  [
    ss("5.1 Transparency and Explainability", 8, "Should a machine explain its decision?", [
      "explain why AI decisions should be explainable",
      "examine a model decision and attempt to explain it",
      "value openness in the systems they build",
    ], [
      "Learners test a model and try to explain its output",
      "Learners compare a rule-based and a learned explanation",
      "Learners write explanation notes for their own project",
    ]),
    ss("5.2 AI, Security and Safety", 8, "How can an AI system be attacked or misused?", [
      "identify ways in which AI systems can be misused or attacked",
      "examine a system for safety weaknesses",
      "commit to building systems that protect users",
    ], [
      "Learners study cases of misuse such as deepfakes and scams",
      "Learners test a classifier with deliberately tricky inputs",
      "Learners list safeguards for their own project",
    ]),
    ss("5.3 AI Policy and Governance", 8, "Who should make the rules for AI in Kenya?", [
      "outline the role of policy in guiding AI development",
      "examine Kenyan and African AI policy positions",
      "value participation in shaping national technology policy",
    ], [
      "Learners read summaries of national AI strategy documents",
      "Learners compare positions from two countries",
      "Learners draft a policy recommendation for their school",
    ]),
    ss("5.4 Applied Capstone Project", 9, "Can our solution stand up to real users and real ethics?", [
      "describe the technical and ethical design of their project",
      "construct, evaluate and document a complete AI solution",
      "show integrity in reporting results and limitations",
    ], [
      "Learners run the complete design cycle on a chosen problem",
      "Learners include an ethics and limitations section",
      "Learners present to a panel of teachers and peers",
    ]),
  ],
]);

export const grade9AI: StrandInfo[] = build([
  [
    ss("1.1 Cognitive Architectures", 5, "How might a machine combine many abilities at once?", [
      "describe how a cognitive architecture combines memory, reasoning and learning",
      "compare two approaches to building general intelligent systems",
      "appreciate the complexity of building general intelligence",
    ], [
      "Learners study diagrams of cognitive architectures",
      "Learners map human abilities onto architecture components",
      "Learners present a comparison of two architectures",
    ]),
    ss("1.2 Foundation Models and Generative AI", 5, "How does a model generate new text or images?", [
      "explain in outline how a generative model produces new content",
      "use a generative tool and evaluate the quality of its output",
      "value critical judgement of generated content",
    ], [
      "Learners prompt a generative tool on a familiar topic",
      "Learners fact-check the output against reliable sources",
      "Learners record where the output was wrong or invented",
    ]),
    ss("1.3 Limits of Current AI", 5, "What still defeats today's best systems?", [
      "identify the known weaknesses of current AI systems",
      "examine outputs that reveal these weaknesses",
      "value humility about what technology can do",
    ], [
      "Learners test tools on reasoning and counting tasks",
      "Learners classify failures by type",
      "Learners discuss what a general system would need instead",
    ]),
  ],
  [
    ss("2.1 Large Data Sets", 6, "What changes when data becomes very large?", [
      "explain the challenges of working with large data sets",
      "practice sampling and summarising a large data set",
      "appreciate careful method when data is too large to read",
    ], [
      "Learners work with a large public data file",
      "Learners take random samples and compare them to the whole",
      "Learners summarise the data set in a short report",
    ]),
    ss("2.2 Data Sovereignty", 6, "Who owns Kenyan data?", [
      "explain the meaning of data sovereignty for Kenya",
      "examine where data about Kenyans is stored and processed",
      "value national interest in the handling of data",
    ], [
      "Learners research where popular services store data",
      "Learners map data flows out of and into Kenya",
      "Learners debate local versus foreign data hosting",
    ]),
    ss("2.3 Building a Local Data Set", 6, "Why do we need data sets made in Kenya?", [
      "explain why locally collected data sets matter for Kenyan AI",
      "conduct the collection of a small local data set with consent",
      "commit to respecting consent and community interests",
    ], [
      "Learners design a consent form for data collection",
      "Learners collect local images, text or Kiswahili audio",
      "Learners document the data set and its intended use",
    ]),
  ],
  [
    ss("3.1 Symbolic Programming Concepts", 6, "How do we program with facts and rules instead of steps?", [
      "explain how symbolic programming represents facts and rules",
      "construct simple symbolic rules that a system can evaluate",
      "appreciate declarative thinking as a way to program",
    ], [
      "Learners write facts and rules for a small knowledge base",
      "Learners run queries against the rules",
      "Learners compare the result with a step-by-step program",
    ]),
    ss("3.2 Machine Learning Workflow in Code", 6, "What does a complete ML workflow look like in code?", [
      "outline the full machine learning workflow from data to evaluation",
      "construct a program that trains and evaluates a model",
      "show rigour in following each workflow stage",
    ], [
      "Learners load and split a data set in code",
      "Learners train and evaluate a model programmatically",
      "Learners report metrics in a results table",
    ]),
    ss("3.3 Building an AI Agent", 6, "How do we build something that acts on its own?", [
      "describe the components of a simple software agent",
      "construct an agent that senses input and takes an action",
      "show responsibility in limiting what an agent may do",
    ], [
      "Learners design an agent for a school task",
      "Learners implement sense, decide and act components",
      "Learners set and test safety limits for the agent",
    ]),
  ],
  [
    ss("4.1 Systems Thinking in Design", 5, "How does our solution fit into the wider system?", [
      "explain how a solution interacts with people, data and institutions",
      "examine the wider system surrounding a chosen problem",
      "value whole-system thinking in design",
    ], [
      "Learners draw a system map around their problem",
      "Learners identify who gains and who loses",
      "Learners adjust the design based on the map",
    ]),
    ss("4.2 Integration and Deployment", 5, "How do we put our solution into real use?", [
      "outline the steps of putting a solution into real use",
      "practice deploying a solution for real users to try",
      "show care for users during deployment",
    ], [
      "Learners prepare deployment instructions",
      "Learners release the solution to a small user group",
      "Learners monitor and record real usage",
    ]),
    ss("4.3 Monitoring and Maintenance", 5, "What happens to our solution after we hand it over?", [
      "explain why deployed systems must be monitored",
      "interpret usage data to detect problems after deployment",
      "commit to supporting what they have built",
    ], [
      "Learners set up a simple usage log",
      "Learners review logs and identify issues",
      "Learners plan maintenance actions",
    ]),
  ],
  [
    ss("5.1 AI and Human Rights", 8, "Can an AI system violate a person's rights?", [
      "explain how AI systems can affect human rights",
      "examine cases where rights were affected by automated decisions",
      "commit to protecting rights in their own work",
    ], [
      "Learners study rights in the Constitution of Kenya",
      "Learners analyse automated decision cases against those rights",
      "Learners write a rights impact note for their project",
    ]),
    ss("5.2 Economic Transformation and AI", 8, "How can AI grow Kenya's economy fairly?", [
      "outline the economic opportunities AI creates in Kenya",
      "interpret data on AI adoption in Kenyan industries",
      "value inclusive growth in technology",
    ], [
      "Learners research AI use in Kenyan startups",
      "Learners analyse data on jobs created and lost",
      "Learners propose a fair adoption plan for a sector",
    ]),
    ss("5.3 Responsible AI Frameworks", 8, "How do organisations keep their AI responsible?", [
      "outline the components of a responsible AI framework",
      "examine an organisation's practice against the framework",
      "commit to responsible practice as future builders",
    ], [
      "Learners study a published responsible AI framework",
      "Learners audit a case organisation against it",
      "Learners write a responsible AI checklist for their school",
    ]),
    ss("5.4 Junior School Exit Project", 9, "What can we build that is ready for real users?", [
      "describe a complete solution including its ethical safeguards",
      "construct, deploy and evaluate the solution with real users",
      "show professionalism and integrity in delivering the project",
    ], [
      "Learners run a full project cycle from problem to deployment",
      "Learners collect real user feedback and metrics",
      "Learners present a portfolio for exit assessment",
    ]),
  ],
]);

// ─────────────────────────────────────────────────────────────
// SENIOR SCHOOL (Grades 10-12) — 4 lessons/week, 132 lessons
// Emphasis: symbolic and neural AI, MeTTa and Wolfram Language,
// model building, agents, AI policy and enterprise
// ─────────────────────────────────────────────────────────────

export const grade10AI: StrandInfo[] = build([
  [
    ss("1.1 Theories of Intelligence", 7, "What theories explain intelligence in humans and machines?", [
      "explain the main theories that describe intelligence",
      "compare biological and computational accounts of intelligence",
      "appreciate the philosophical depth of the field",
    ], [
      "Learners read summaries of leading theories of intelligence",
      "Learners build a comparison matrix of the theories",
      "Learners debate which theory best guides AI design",
    ]),
    ss("1.2 Symbolic AI and the Knowledge Tradition", 7, "Why did early AI rely on symbols and logic?", [
      "outline the principles of symbolic artificial intelligence",
      "practice expressing a problem in symbolic form",
      "value formal precision in expressing knowledge",
    ], [
      "Learners translate word problems into logical statements",
      "Learners evaluate the statements for truth",
      "Learners identify problems that resist symbolic expression",
    ]),
    ss("1.3 Connectionism and Deep Learning", 6, "How did learning from data come to dominate AI?", [
      "explain the principles of connectionist and deep learning systems",
      "compare symbolic and connectionist systems on the same task",
      "appreciate the strengths and weaknesses of each tradition",
    ], [
      "Learners study the structure of deep networks",
      "Learners run the same task through both kinds of system",
      "Learners present findings on where each excelled",
    ]),
  ],
  [
    ss("2.1 Data Engineering Foundations", 8, "How is data prepared at professional scale?", [
      "outline professional practices in preparing data for AI",
      "construct a reproducible data preparation pipeline",
      "value reproducibility and documentation in data work",
    ], [
      "Learners build a pipeline that cleans and transforms raw data",
      "Learners version their data and scripts",
      "Learners rerun the pipeline to prove reproducibility",
    ]),
    ss("2.2 Statistical Description of Data", 8, "What do the numbers say before any model is built?", [
      "explain the statistical measures that describe a data set",
      "compute and interpret descriptive statistics for a data set",
      "value evidence over assumption",
    ], [
      "Learners compute measures of centre and spread",
      "Learners visualise distributions and outliers",
      "Learners write a data description report",
    ]),
    ss("2.3 Symbolic Knowledge Representation", 8, "How do we write knowledge that a reasoning engine can use?", [
      "describe atomspace-style representation of knowledge as atoms and links",
      "construct a knowledge base using symbolic notation",
      "appreciate rigour in representing knowledge formally",
    ], [
      "Learners represent a Kenyan agriculture domain as atoms and links",
      "Learners write the representation in MeTTa notation",
      "Learners check the representation for contradictions",
    ]),
  ],
  [
    ss("3.1 Programming Fundamentals for AI", 8, "Which programming ideas underpin all AI work?", [
      "outline the programming constructs used across AI systems",
      "construct programs using functions, data structures and iteration",
      "show discipline in writing readable code",
    ], [
      "Learners implement common data structures",
      "Learners refactor code for readability",
      "Learners review each other's code against a style guide",
    ]),
    ss("3.2 Introduction to MeTTa", 8, "How does MeTTa let us program with knowledge itself?", [
      "explain the syntax and evaluation model of MeTTa",
      "construct MeTTa programs that define atoms, types and rewrite rules",
      "appreciate declarative programming as a route to general reasoning",
    ], [
      "Learners install or access a MeTTa environment and run examples",
      "Learners write atoms, grounded values and simple rewrite rules",
      "Learners query a MeTTa knowledge base and trace the evaluation",
    ]),
    ss("3.3 Introduction to Wolfram Language", 8, "How does a computational language shorten AI work?", [
      "explain the symbolic and computational design of Wolfram Language",
      "construct Wolfram Language expressions for computation and data analysis",
      "value expressive tools that reduce repetitive work",
    ], [
      "Learners evaluate symbolic and numeric expressions in a notebook",
      "Learners use built-in data and plotting functions",
      "Learners solve a mathematics problem symbolically and numerically",
    ]),
  ],
  [
    ss("4.1 The AI Project Life Cycle", 7, "What stages does a professional AI project follow?", [
      "outline the stages of a professional AI project life cycle",
      "plan a project against each stage of the life cycle",
      "value structured working over improvisation",
    ], [
      "Learners produce a staged project plan with milestones",
      "Learners assign roles and deliverables per stage",
      "Learners review the plan against a professional template",
    ]),
    ss("4.2 Building a Baseline Model", 7, "Why start with the simplest model that works?", [
      "explain the purpose of a baseline model",
      "construct and evaluate a baseline model for their problem",
      "value modest starting points before complexity",
    ], [
      "Learners implement a simple baseline in code",
      "Learners record its metrics as a reference point",
      "Learners justify any added complexity against the baseline",
    ]),
    ss("4.3 Version Control and Collaboration", 6, "How do teams build software together without losing work?", [
      "describe how version control supports team development",
      "practice committing, branching and merging project work",
      "show cooperation and accountability in shared work",
    ], [
      "Learners set up a shared repository",
      "Learners work on branches and merge their changes",
      "Learners resolve a deliberate merge conflict",
    ]),
  ],
  [
    ss("5.1 Ethical Theory Applied to AI", 9, "Which ethical framework should guide a difficult AI decision?", [
      "outline the main ethical frameworks used to judge technology",
      "examine a difficult AI case using more than one framework",
      "commit to reasoned ethical judgement rather than opinion",
    ], [
      "Learners study consequentialist, duty and virtue approaches",
      "Learners analyse a case using each framework in turn",
      "Learners defend a position in a structured debate",
    ]),
    ss("5.2 AI in the Kenyan Policy Landscape", 9, "How is Kenya choosing to govern AI?", [
      "outline Kenya's national position on artificial intelligence",
      "examine national strategy documents against real practice",
      "value informed citizenship in technology policy",
    ], [
      "Learners read the national AI strategy and data protection law",
      "Learners compare stated policy with observed practice",
      "Learners write a policy brief for a chosen sector",
    ]),
    ss("5.3 Global Comparative Models", 9, "What can Kenya learn from other countries?", [
      "compare AI education and governance models from other countries",
      "examine the UNESCO competency framework against Kenyan needs",
      "value learning from others while adapting to local context",
    ], [
      "Learners study the UNESCO, UK, Finland and China models",
      "Learners build a comparative matrix",
      "Learners recommend adaptations suitable for Kenya",
    ]),
    ss("5.4 Term Capstone: Symbolic Reasoner", 17, "Can we build a reasoning system for a Kenyan domain?", [
      "describe the design of a symbolic reasoning system for a chosen domain",
      "construct and evaluate the reasoner in MeTTa or Wolfram Language",
      "show integrity in documenting limitations and ethical risks",
    ], [
      "Learners select a domain and gather its rules and facts",
      "Learners implement the reasoner and test it on real queries",
      "Learners present the system with documentation and an ethics review",
    ]),
  ],
]);

export const grade11AI: StrandInfo[] = build([
  [
    ss("1.1 Learning Theory", 7, "What does it mean, mathematically, for a machine to learn?", [
      "explain the formal idea of learning from data",
      "interpret learning curves and generalisation behaviour",
      "value mathematical grounding in AI work",
    ], [
      "Learners study training and generalisation error",
      "Learners plot and interpret learning curves",
      "Learners explain overfitting from their own plots",
    ]),
    ss("1.2 Reasoning Under Uncertainty", 7, "How does a machine decide when it is not sure?", [
      "explain how probability supports reasoning under uncertainty",
      "compute simple probabilistic inferences",
      "appreciate honest handling of uncertainty",
    ], [
      "Learners work through probability problems by hand",
      "Learners implement a naive Bayes classifier",
      "Learners report confidence alongside predictions",
    ]),
    ss("1.3 Neuro-Symbolic Integration", 6, "Can symbolic reasoning and neural learning work together?", [
      "describe approaches to combining symbolic and neural methods",
      "compare a neural, a symbolic and a hybrid solution to one task",
      "appreciate integration as a path towards general intelligence",
    ], [
      "Learners implement the same task three ways",
      "Learners compare accuracy, explainability and data needs",
      "Learners present a case for the hybrid approach",
    ]),
  ],
  [
    ss("2.1 Feature Engineering", 8, "How do we turn raw data into useful signals?", [
      "explain how engineered features improve model performance",
      "construct new features from a raw data set and test their effect",
      "value creativity grounded in evidence",
    ], [
      "Learners derive features from date, text and location fields",
      "Learners measure the effect of each feature on performance",
      "Learners document feature decisions",
    ]),
    ss("2.2 Working with Text and Language Data", 8, "How is Kiswahili text prepared for a model?", [
      "describe the steps of preparing text data for modelling",
      "practice tokenising and vectorising Kiswahili and English text",
      "value inclusion of African languages in AI",
    ], [
      "Learners tokenise Kiswahili sentences and inspect the tokens",
      "Learners build simple vector representations",
      "Learners compare tool performance on Kiswahili and English",
    ]),
    ss("2.3 Data Ethics and Consent at Scale", 8, "Is consent still meaningful when data is collected in bulk?", [
      "explain the ethical requirements of large-scale data collection",
      "examine a data set's provenance and consent basis",
      "commit to lawful and ethical data sourcing",
    ], [
      "Learners audit public data sets for provenance",
      "Learners write a consent and provenance statement",
      "Learners reject a data set that fails the audit and justify it",
    ]),
  ],
  [
    ss("3.1 Advanced MeTTa Programming", 8, "How do we express complex reasoning in MeTTa?", [
      "explain non-determinism, types and pattern matching in MeTTa",
      "construct MeTTa programs that perform multi-step inference",
      "value elegance and clarity in declarative code",
    ], [
      "Learners write typed MeTTa definitions and pattern-matching rules",
      "Learners implement multi-step inference chains",
      "Learners trace non-deterministic evaluation results",
    ]),
    ss("3.2 Machine Learning in Wolfram Language", 8, "How fast can we go from data to a trained model?", [
      "outline the built-in machine learning functions of Wolfram Language",
      "construct and evaluate models using these built-in functions",
      "appreciate high-level tooling for rapid experimentation",
    ], [
      "Learners train classifiers and predictors on supplied data",
      "Learners inspect model information and performance reports",
      "Learners compare the built-in model with a hand-built one",
    ]),
    ss("3.3 Neural Network Implementation", 8, "What happens inside the layers we train?", [
      "explain the operation of layers, weights and training loops",
      "construct and train a neural network for a chosen task",
      "show perseverance through long training and tuning cycles",
    ], [
      "Learners implement a small network layer by layer",
      "Learners tune learning rate and architecture",
      "Learners record every experiment in a results log",
    ]),
  ],
  [
    ss("4.1 Requirements Engineering", 7, "How do we capture what a real client actually needs?", [
      "outline how requirements are gathered and recorded",
      "conduct a requirements interview and produce a specification",
      "value listening carefully to clients",
    ], [
      "Learners interview a real or role-played client",
      "Learners write a specification document",
      "Learners have the client confirm the specification",
    ]),
    ss("4.2 Building an Intelligent Agent", 7, "How do we build an agent that plans and acts?", [
      "describe the architecture of a planning agent",
      "construct an agent that plans and executes multi-step tasks",
      "show responsibility in bounding agent autonomy",
    ], [
      "Learners design an agent architecture diagram",
      "Learners implement planning and execution components",
      "Learners test the agent and impose safety limits",
    ]),
    ss("4.3 Evaluation and Benchmarking", 6, "How do we prove that our system is genuinely better?", [
      "explain benchmarking methods for AI systems",
      "conduct a benchmark comparison and report the results",
      "value honesty in reporting comparative results",
    ], [
      "Learners define benchmark tasks and metrics",
      "Learners run the benchmark on competing systems",
      "Learners publish a results table with limitations noted",
    ]),
  ],
  [
    ss("5.1 Accountability and Liability", 9, "Who answers when an AI system causes harm?", [
      "explain how responsibility is assigned when AI causes harm",
      "examine cases and assign accountability with reasons",
      "commit to accepting responsibility for what they build",
    ], [
      "Learners study real incidents involving automated systems",
      "Learners map responsibility across developers, deployers and users",
      "Learners write an accountability clause for their project",
    ]),
    ss("5.2 AI, Work and Enterprise in Kenya", 9, "How can young Kenyans build enterprises with AI?", [
      "outline enterprise opportunities created by AI in Kenya",
      "examine a business case for an AI-based venture",
      "value enterprise and self-reliance",
    ], [
      "Learners study Kenyan AI ventures",
      "Learners build a business model canvas for an AI idea",
      "Learners pitch the venture to peers",
    ]),
    ss("5.3 Inclusive and Accessible AI", 9, "Who is left out by the systems we build?", [
      "explain how AI systems exclude certain users",
      "examine a system for accessibility and language barriers",
      "value inclusion of all learners and citizens",
    ], [
      "Learners test tools with users of different abilities and languages",
      "Learners record exclusion points found",
      "Learners redesign one feature for inclusion",
    ]),
    ss("5.4 Term Capstone: Applied AI System", 17, "Can we deliver a working AI system for a real client?", [
      "describe the full architecture and evaluation of their system",
      "construct, benchmark and deploy the system for a real client",
      "show professionalism in delivery and documentation",
    ], [
      "Learners work with a real client through the full cycle",
      "Learners benchmark and deploy the solution",
      "Learners deliver documentation, ethics review and handover",
    ]),
  ],
]);

export const grade12AI: StrandInfo[] = build([
  [
    ss("1.1 Pathways to Artificial General Intelligence", 7, "What would it take to build a genuinely general mind?", [
      "outline the leading research pathways towards general intelligence",
      "compare the assumptions behind each pathway",
      "appreciate open scientific questions in the field",
    ], [
      "Learners review research summaries on AI approaches",
      "Learners map assumptions and open problems per pathway",
      "Learners present a critique of one pathway",
    ]),
    ss("1.2 Consciousness, Agency and Mind", 7, "Could a machine ever be said to understand?", [
      "explain the philosophical arguments about machine understanding",
      "examine arguments for and against machine consciousness",
      "value reasoned reflection on hard questions",
    ], [
      "Learners study the Chinese Room and related arguments",
      "Learners construct arguments on both sides",
      "Learners hold a formal debate",
    ]),
    ss("1.3 Alignment and Control", 6, "How do we keep powerful systems doing what we intend?", [
      "explain the problem of aligning AI systems with human intent",
      "examine alignment failures in existing systems",
      "commit to safety as a design priority",
    ], [
      "Learners study specification gaming examples",
      "Learners test a system for unintended behaviour",
      "Learners write alignment requirements for their project",
    ]),
  ],
  [
    ss("2.1 Data Strategy for Organisations", 8, "How should an organisation plan its data?", [
      "outline the components of an organisational data strategy",
      "construct a data strategy for a chosen organisation",
      "value long-term planning over short-term fixes",
    ], [
      "Learners audit an organisation's data holdings",
      "Learners draft a data strategy document",
      "Learners present the strategy to the organisation",
    ]),
    ss("2.2 Building Kenyan Language Data Sets", 8, "How do we build AI that speaks our languages?", [
      "explain the requirements of building a language data set for Kenyan languages",
      "conduct the collection and annotation of a Kenyan language data set",
      "value the preservation and digital presence of local languages",
    ], [
      "Learners collect Kiswahili or indigenous language samples with consent",
      "Learners annotate the samples using agreed guidelines",
      "Learners publish the data set with a licence and data card",
    ]),
    ss("2.3 Knowledge Graphs and Ontologies", 8, "How do we formalise an entire domain of knowledge?", [
      "explain how ontologies formalise a domain of knowledge",
      "construct an ontology and query it programmatically",
      "appreciate systematic organisation of knowledge",
    ], [
      "Learners design an ontology for a Kenyan sector",
      "Learners implement it in MeTTa or a graph tool",
      "Learners run reasoning queries against the ontology",
    ]),
  ],
  [
    ss("3.1 Advanced Symbolic Reasoning in MeTTa", 8, "Can our reasoner learn and revise its own rules?", [
      "explain how a MeTTa program can transform its own rules",
      "construct a self-modifying reasoning program in MeTTa",
      "value rigour when building systems that change themselves",
    ], [
      "Learners implement meta-rules that rewrite other rules",
      "Learners test the system's behaviour as rules change",
      "Learners bound the system to prevent runaway rewriting",
    ]),
    ss("3.2 Computational Modelling in Wolfram Language", 8, "How do we model a real Kenyan system computationally?", [
      "explain how computational models simulate real systems",
      "construct a simulation of a real system in Wolfram Language",
      "value evidence-based modelling of real problems",
    ], [
      "Learners model rainfall, disease spread or market prices",
      "Learners validate the model against real data",
      "Learners present findings with visualisations",
    ]),
    ss("3.3 Multi-Agent and Generative Systems", 8, "What happens when several intelligent agents interact?", [
      "describe how multiple agents coordinate or compete",
      "construct a multi-agent or generative system for a chosen task",
      "show responsibility in controlling emergent behaviour",
    ], [
      "Learners implement two or more interacting agents",
      "Learners observe and record emergent behaviour",
      "Learners add coordination and safety rules",
    ]),
  ],
  [
    ss("4.1 Research Methods in AI", 7, "How is an AI claim proved or disproved?", [
      "outline the methods used to conduct and report AI research",
      "conduct a small controlled experiment with a stated hypothesis",
      "value scientific honesty and replicability",
    ], [
      "Learners state a hypothesis and design an experiment",
      "Learners run controlled trials and record results",
      "Learners write the study in research report format",
    ]),
    ss("4.2 Productisation and Scaling", 7, "How does a prototype become a product people rely on?", [
      "explain what is required to take a prototype to a reliable product",
      "practice packaging, testing and scaling a solution",
      "value reliability and user trust",
    ], [
      "Learners package a solution for distribution",
      "Learners load-test and harden the solution",
      "Learners write user and maintenance documentation",
    ]),
    ss("4.3 Portfolio and Professional Presentation", 6, "How do we present ourselves as AI professionals?", [
      "describe the contents of a professional AI portfolio",
      "construct a portfolio of their completed AI work",
      "show pride and professionalism in their achievements",
    ], [
      "Learners assemble projects, code and reports into a portfolio",
      "Learners rehearse a professional presentation",
      "Learners present the portfolio to an external panel",
    ]),
  ],
  [
    ss("5.1 AI Governance and Regulation", 9, "How should Kenya regulate powerful AI systems?", [
      "outline approaches to regulating advanced AI systems",
      "examine proposed regulations against Kenyan realities",
      "value the rule of law in technology development",
    ], [
      "Learners compare regulatory approaches across jurisdictions",
      "Learners assess their fit for Kenya",
      "Learners draft a regulatory proposal",
    ]),
    ss("5.2 AI Sovereignty and National Strategy", 9, "Should Kenya build its own AI, or buy it?", [
      "explain the meaning and stakes of AI sovereignty for Kenya",
      "examine the trade-offs between local building and foreign systems",
      "commit to advancing national technological capacity",
    ], [
      "Learners research national AI capability across Africa",
      "Learners analyse dependency risks",
      "Learners debate a sovereignty position for Kenya",
    ]),
    ss("5.3 Existential and Long-Term Risk", 9, "What are the long-term risks of very capable AI?", [
      "outline long-term risks associated with highly capable AI",
      "examine risk arguments critically against available evidence",
      "value sober and evidence-based risk assessment",
    ], [
      "Learners study long-term risk literature",
      "Learners separate evidenced claims from speculation",
      "Learners write a balanced risk assessment",
    ]),
    ss("5.4 Exit Capstone: AI Research Project", 17, "What original contribution can we make to AI in Kenya?", [
      "describe an original research question and its method",
      "conduct, evaluate and defend a complete research project",
      "show integrity, independence and scholarly discipline",
    ], [
      "Learners select an original research question",
      "Learners conduct the study with proper method and ethics",
      "Learners defend the work before an assessment panel",
    ]),
  ],
]);
