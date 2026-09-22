"""AI curriculum identifiers aligned with the teacher-facing TypeScript pack."""

from .types import StrandInfo


grade6AIIdentifiers: list[StrandInfo] = [
    {"name": '1.0 Foundations of Intelligence', "subStrands": [
        {"name": '1.1 What is Intelligence?', "lessons": 4, "keyInquiryQuestion": 'How do we know that something is intelligent?'},
        {"name": '1.2 Meaning of Artificial Intelligence', "lessons": 4, "keyInquiryQuestion": 'What does it mean to say a machine is intelligent?'},
        {"name": '1.3 Artificial Intelligence Around Us in Kenya', "lessons": 4, "keyInquiryQuestion": 'Where do we meet artificial intelligence in our community?'},
    ]},
    {"name": '2.0 Data and Representation', "subStrands": [
        {"name": '2.1 Meaning and Sources of Data', "lessons": 5, "keyInquiryQuestion": 'What is data and where does it come from?'},
        {"name": '2.2 Sorting and Grouping Data', "lessons": 5, "keyInquiryQuestion": 'Why do we group information before using it?'},
    ]},
    {"name": '3.0 AI Techniques and Programming', "subStrands": [
        {"name": '3.1 Machines Follow Instructions', "lessons": 4, "keyInquiryQuestion": 'How does a machine know what to do?'},
        {"name": '3.2 Teaching a Machine by Example', "lessons": 4, "keyInquiryQuestion": 'How can a machine learn from examples?'},
        {"name": '3.3 Talking and Listening Machines', "lessons": 4, "keyInquiryQuestion": 'How do machines understand what we say?'},
    ]},
    {"name": '4.0 AI System Design and Projects', "subStrands": [
        {"name": '4.1 Spotting Problems Artificial Intelligence Can Help Solve', "lessons": 5, "keyInquiryQuestion": 'Which everyday problems could an intelligent machine help with?'},
        {"name": '4.2 Simple Class Project', "lessons": 5, "keyInquiryQuestion": 'How can we show our idea to others?'},
    ]},
    {"name": '5.0 Ethics, Society and AI Policy', "subStrands": [
        {"name": '5.1 Safe Use of Intelligent Tools', "lessons": 6, "keyInquiryQuestion": 'How do we stay safe when using intelligent tools?'},
        {"name": '5.2 Honesty When Using Artificial Intelligence', "lessons": 6, "keyInquiryQuestion": "Is it honest to present a machine's work as our own?"},
        {"name": '5.3 Keeping Personal Information Private', "lessons": 5, "keyInquiryQuestion": 'Which information should we never share with a machine?'},
        {"name": '5.4 Artificial Intelligence and Our Future Work', "lessons": 5, "keyInquiryQuestion": 'How will intelligent machines change the work we do?'},
    ]},
]

grade7AIIdentifiers: list[StrandInfo] = [
    {"name": '1.0 Foundations of Intelligence', "subStrands": [
        {"name": '1.1 Defining Artificial Intelligence', "lessons": 5, "keyInquiryQuestion": 'What makes a system artificially intelligent?'},
        {"name": '1.2 Symbolic and Connectionist Approaches', "lessons": 5, "keyInquiryQuestion": 'Do machines reason with rules or with examples?'},
        {"name": '1.3 The Road Towards General Intelligence', "lessons": 5, "keyInquiryQuestion": 'How far are we from a machine that can learn anything?'},
    ]},
    {"name": '2.0 Data and Representation', "subStrands": [
        {"name": '2.1 The Data Life Cycle', "lessons": 6, "keyInquiryQuestion": 'What happens to data from collection to use?'},
        {"name": '2.2 Data Cleaning and Preparation', "lessons": 6, "keyInquiryQuestion": 'Why is most of AI work actually data work?'},
        {"name": '2.3 Labelling and Annotation', "lessons": 6, "keyInquiryQuestion": 'Who decides what a label means?'},
    ]},
    {"name": '3.0 AI Techniques and Programming', "subStrands": [
        {"name": '3.1 Supervised Learning', "lessons": 6, "keyInquiryQuestion": 'How does a machine learn from labelled examples?'},
        {"name": '3.2 Introduction to Text Programming', "lessons": 6, "keyInquiryQuestion": 'How is text programming different from blocks?'},
        {"name": '3.3 Evaluating a Model', "lessons": 6, "keyInquiryQuestion": 'How do we measure whether a model is good?'},
    ]},
    {"name": '4.0 AI System Design and Projects', "subStrands": [
        {"name": '4.1 Problem Framing', "lessons": 5, "keyInquiryQuestion": 'Is AI the right tool for this problem?'},
        {"name": '4.2 Prototyping', "lessons": 5, "keyInquiryQuestion": 'How do we make a first working version quickly?'},
        {"name": '4.3 Documentation', "lessons": 5, "keyInquiryQuestion": 'How will others understand what we built?'},
    ]},
    {"name": '5.0 Ethics, Society and AI Policy', "subStrands": [
        {"name": '5.1 Ethical Principles for AI', "lessons": 8, "keyInquiryQuestion": 'What principles should guide anyone who builds AI?'},
        {"name": '5.2 Algorithmic Bias', "lessons": 8, "keyInquiryQuestion": 'How does bias get into a system that has no feelings?'},
        {"name": '5.3 Data Protection in Kenya', "lessons": 8, "keyInquiryQuestion": 'What does Kenyan law say about our data?'},
        {"name": '5.4 Junior Capstone Project', "lessons": 9, "keyInquiryQuestion": 'How can we solve a real Kenyan problem with AI?'},
    ]},
]

grade8AIIdentifiers: list[StrandInfo] = [
    {"name": '1.0 Foundations of Intelligence', "subStrands": [
        {"name": '1.1 Search and Problem Solving', "lessons": 5, "keyInquiryQuestion": 'How does a machine find a path to a goal?'},
        {"name": '1.2 Knowledge and Reasoning', "lessons": 5, "keyInquiryQuestion": 'Can a machine draw a conclusion from facts?'},
        {"name": '1.3 Agents and Environments', "lessons": 5, "keyInquiryQuestion": 'What makes a program an agent?'},
    ]},
    {"name": '2.0 Data and Representation', "subStrands": [
        {"name": '2.1 Features and Attributes', "lessons": 6, "keyInquiryQuestion": 'What does a model actually look at?'},
        {"name": '2.2 Data Visualisation', "lessons": 6, "keyInquiryQuestion": 'What can a chart reveal that a table hides?'},
        {"name": '2.3 Knowledge Graphs', "lessons": 6, "keyInquiryQuestion": 'How can relationships between facts be stored?'},
    ]},
    {"name": '3.0 AI Techniques and Programming', "subStrands": [
        {"name": '3.1 Unsupervised Learning and Clustering', "lessons": 6, "keyInquiryQuestion": 'Can a machine group data without being told the groups?'},
        {"name": '3.2 Programming Data Pipelines', "lessons": 6, "keyInquiryQuestion": 'How do we move data through a program?'},
        {"name": '3.3 Introduction to Neural Networks', "lessons": 6, "keyInquiryQuestion": 'How is a neural network different from a set of rules?'},
    ]},
    {"name": '4.0 AI System Design and Projects', "subStrands": [
        {"name": '4.1 Requirements and Constraints', "lessons": 5, "keyInquiryQuestion": 'What limits must our solution work within?'},
        {"name": '4.2 Iterative Development', "lessons": 5, "keyInquiryQuestion": 'Why do we build in small repeated steps?'},
        {"name": '4.3 User Testing', "lessons": 5, "keyInquiryQuestion": 'What do real users say about what we built?'},
    ]},
    {"name": '5.0 Ethics, Society and AI Policy', "subStrands": [
        {"name": '5.1 Transparency and Explainability', "lessons": 8, "keyInquiryQuestion": 'Should a machine explain its decision?'},
        {"name": '5.2 AI, Security and Safety', "lessons": 8, "keyInquiryQuestion": 'How can an AI system be attacked or misused?'},
        {"name": '5.3 AI Policy and Governance', "lessons": 8, "keyInquiryQuestion": 'Who should make the rules for AI in Kenya?'},
        {"name": '5.4 Applied Capstone Project', "lessons": 9, "keyInquiryQuestion": 'Can our solution stand up to real users and real ethics?'},
    ]},
]

grade9AIIdentifiers: list[StrandInfo] = [
    {"name": '1.0 Foundations of Intelligence', "subStrands": [
        {"name": '1.1 Cognitive Architectures', "lessons": 5, "keyInquiryQuestion": 'How might a machine combine many abilities at once?'},
        {"name": '1.2 Foundation Models and Generative AI', "lessons": 5, "keyInquiryQuestion": 'How does a model generate new text or images?'},
        {"name": '1.3 Limits of Current AI', "lessons": 5, "keyInquiryQuestion": "What still defeats today's best systems?"},
    ]},
    {"name": '2.0 Data and Representation', "subStrands": [
        {"name": '2.1 Large Data Sets', "lessons": 6, "keyInquiryQuestion": 'What changes when data becomes very large?'},
        {"name": '2.2 Data Sovereignty', "lessons": 6, "keyInquiryQuestion": 'Who owns Kenyan data?'},
        {"name": '2.3 Building a Local Data Set', "lessons": 6, "keyInquiryQuestion": 'Why do we need data sets made in Kenya?'},
    ]},
    {"name": '3.0 AI Techniques and Programming', "subStrands": [
        {"name": '3.1 Symbolic Programming Concepts', "lessons": 6, "keyInquiryQuestion": 'How do we program with facts and rules instead of steps?'},
        {"name": '3.2 Machine Learning Workflow in Code', "lessons": 6, "keyInquiryQuestion": 'What does a complete ML workflow look like in code?'},
        {"name": '3.3 Building an AI Agent', "lessons": 6, "keyInquiryQuestion": 'How do we build something that acts on its own?'},
    ]},
    {"name": '4.0 AI System Design and Projects', "subStrands": [
        {"name": '4.1 Systems Thinking in Design', "lessons": 5, "keyInquiryQuestion": 'How does our solution fit into the wider system?'},
        {"name": '4.2 Integration and Deployment', "lessons": 5, "keyInquiryQuestion": 'How do we put our solution into real use?'},
        {"name": '4.3 Monitoring and Maintenance', "lessons": 5, "keyInquiryQuestion": 'What happens to our solution after we hand it over?'},
    ]},
    {"name": '5.0 Ethics, Society and AI Policy', "subStrands": [
        {"name": '5.1 AI and Human Rights', "lessons": 8, "keyInquiryQuestion": "Can an AI system violate a person's rights?"},
        {"name": '5.2 Economic Transformation and AI', "lessons": 8, "keyInquiryQuestion": "How can AI grow Kenya's economy fairly?"},
        {"name": '5.3 Responsible AI Frameworks', "lessons": 8, "keyInquiryQuestion": 'How do organisations keep their AI responsible?'},
        {"name": '5.4 Junior School Exit Project', "lessons": 9, "keyInquiryQuestion": 'What can we build that is ready for real users?'},
    ]},
]

grade10AIIdentifiers: list[StrandInfo] = [
    {"name": '1.0 Foundations of Intelligence', "subStrands": [
        {"name": '1.1 Theories of Intelligence', "lessons": 7, "keyInquiryQuestion": 'What theories explain intelligence in humans and machines?'},
        {"name": '1.2 Symbolic AI and the Knowledge Tradition', "lessons": 7, "keyInquiryQuestion": 'Why did early AI rely on symbols and logic?'},
        {"name": '1.3 Connectionism and Deep Learning', "lessons": 6, "keyInquiryQuestion": 'How did learning from data come to dominate AI?'},
    ]},
    {"name": '2.0 Data and Representation', "subStrands": [
        {"name": '2.1 Data Engineering Foundations', "lessons": 8, "keyInquiryQuestion": 'How is data prepared at professional scale?'},
        {"name": '2.2 Statistical Description of Data', "lessons": 8, "keyInquiryQuestion": 'What do the numbers say before any model is built?'},
        {"name": '2.3 Symbolic Knowledge Representation', "lessons": 8, "keyInquiryQuestion": 'How do we write knowledge that a reasoning engine can use?'},
    ]},
    {"name": '3.0 AI Techniques and Programming', "subStrands": [
        {"name": '3.1 Programming Fundamentals for AI', "lessons": 8, "keyInquiryQuestion": 'Which programming ideas underpin all AI work?'},
        {"name": '3.2 Introduction to MeTTa', "lessons": 8, "keyInquiryQuestion": 'How does MeTTa let us program with knowledge itself?'},
        {"name": '3.3 Introduction to Wolfram Language', "lessons": 8, "keyInquiryQuestion": 'How does a computational language shorten AI work?'},
    ]},
    {"name": '4.0 AI System Design and Projects', "subStrands": [
        {"name": '4.1 The AI Project Life Cycle', "lessons": 7, "keyInquiryQuestion": 'What stages does a professional AI project follow?'},
        {"name": '4.2 Building a Baseline Model', "lessons": 7, "keyInquiryQuestion": 'Why start with the simplest model that works?'},
        {"name": '4.3 Version Control and Collaboration', "lessons": 6, "keyInquiryQuestion": 'How do teams build software together without losing work?'},
    ]},
    {"name": '5.0 Ethics, Society and AI Policy', "subStrands": [
        {"name": '5.1 Ethical Theory Applied to AI', "lessons": 9, "keyInquiryQuestion": 'Which ethical framework should guide a difficult AI decision?'},
        {"name": '5.2 AI in the Kenyan Policy Landscape', "lessons": 9, "keyInquiryQuestion": 'How is Kenya choosing to govern AI?'},
        {"name": '5.3 Global Comparative Models', "lessons": 9, "keyInquiryQuestion": 'What can Kenya learn from other countries?'},
        {"name": '5.4 Term Capstone: Symbolic Reasoner', "lessons": 17, "keyInquiryQuestion": 'Can we build a reasoning system for a Kenyan domain?'},
    ]},
]

grade11AIIdentifiers: list[StrandInfo] = [
    {"name": '1.0 Foundations of Intelligence', "subStrands": [
        {"name": '1.1 Learning Theory', "lessons": 7, "keyInquiryQuestion": 'What does it mean, mathematically, for a machine to learn?'},
        {"name": '1.2 Reasoning Under Uncertainty', "lessons": 7, "keyInquiryQuestion": 'How does a machine decide when it is not sure?'},
        {"name": '1.3 Neuro-Symbolic Integration', "lessons": 6, "keyInquiryQuestion": 'Can symbolic reasoning and neural learning work together?'},
    ]},
    {"name": '2.0 Data and Representation', "subStrands": [
        {"name": '2.1 Feature Engineering', "lessons": 8, "keyInquiryQuestion": 'How do we turn raw data into useful signals?'},
        {"name": '2.2 Working with Text and Language Data', "lessons": 8, "keyInquiryQuestion": 'How is Kiswahili text prepared for a model?'},
        {"name": '2.3 Data Ethics and Consent at Scale', "lessons": 8, "keyInquiryQuestion": 'Is consent still meaningful when data is collected in bulk?'},
    ]},
    {"name": '3.0 AI Techniques and Programming', "subStrands": [
        {"name": '3.1 Advanced MeTTa Programming', "lessons": 8, "keyInquiryQuestion": 'How do we express complex reasoning in MeTTa?'},
        {"name": '3.2 Machine Learning in Wolfram Language', "lessons": 8, "keyInquiryQuestion": 'How fast can we go from data to a trained model?'},
        {"name": '3.3 Neural Network Implementation', "lessons": 8, "keyInquiryQuestion": 'What happens inside the layers we train?'},
    ]},
    {"name": '4.0 AI System Design and Projects', "subStrands": [
        {"name": '4.1 Requirements Engineering', "lessons": 7, "keyInquiryQuestion": 'How do we capture what a real client actually needs?'},
        {"name": '4.2 Building an Intelligent Agent', "lessons": 7, "keyInquiryQuestion": 'How do we build an agent that plans and acts?'},
        {"name": '4.3 Evaluation and Benchmarking', "lessons": 6, "keyInquiryQuestion": 'How do we prove that our system is genuinely better?'},
    ]},
    {"name": '5.0 Ethics, Society and AI Policy', "subStrands": [
        {"name": '5.1 Accountability and Liability', "lessons": 9, "keyInquiryQuestion": 'Who answers when an AI system causes harm?'},
        {"name": '5.2 AI, Work and Enterprise in Kenya', "lessons": 9, "keyInquiryQuestion": 'How can young Kenyans build enterprises with AI?'},
        {"name": '5.3 Inclusive and Accessible AI', "lessons": 9, "keyInquiryQuestion": 'Who is left out by the systems we build?'},
        {"name": '5.4 Term Capstone: Applied AI System', "lessons": 17, "keyInquiryQuestion": 'Can we deliver a working AI system for a real client?'},
    ]},
]

grade12AIIdentifiers: list[StrandInfo] = [
    {"name": '1.0 Foundations of Intelligence', "subStrands": [
        {"name": '1.1 Pathways to Artificial General Intelligence', "lessons": 7, "keyInquiryQuestion": 'What would it take to build a genuinely general mind?'},
        {"name": '1.2 Consciousness, Agency and Mind', "lessons": 7, "keyInquiryQuestion": 'Could a machine ever be said to understand?'},
        {"name": '1.3 Alignment and Control', "lessons": 6, "keyInquiryQuestion": 'How do we keep powerful systems doing what we intend?'},
    ]},
    {"name": '2.0 Data and Representation', "subStrands": [
        {"name": '2.1 Data Strategy for Organisations', "lessons": 8, "keyInquiryQuestion": 'How should an organisation plan its data?'},
        {"name": '2.2 Building Kenyan Language Data Sets', "lessons": 8, "keyInquiryQuestion": 'How do we build AI that speaks our languages?'},
        {"name": '2.3 Knowledge Graphs and Ontologies', "lessons": 8, "keyInquiryQuestion": 'How do we formalise an entire domain of knowledge?'},
    ]},
    {"name": '3.0 AI Techniques and Programming', "subStrands": [
        {"name": '3.1 Advanced Symbolic Reasoning in MeTTa', "lessons": 8, "keyInquiryQuestion": 'Can our reasoner learn and revise its own rules?'},
        {"name": '3.2 Computational Modelling in Wolfram Language', "lessons": 8, "keyInquiryQuestion": 'How do we model a real Kenyan system computationally?'},
        {"name": '3.3 Multi-Agent and Generative Systems', "lessons": 8, "keyInquiryQuestion": 'What happens when several intelligent agents interact?'},
    ]},
    {"name": '4.0 AI System Design and Projects', "subStrands": [
        {"name": '4.1 Research Methods in AI', "lessons": 7, "keyInquiryQuestion": 'How is an AI claim proved or disproved?'},
        {"name": '4.2 Productisation and Scaling', "lessons": 7, "keyInquiryQuestion": 'How does a prototype become a product people rely on?'},
        {"name": '4.3 Portfolio and Professional Presentation', "lessons": 6, "keyInquiryQuestion": 'How do we present ourselves as AI professionals?'},
    ]},
    {"name": '5.0 Ethics, Society and AI Policy', "subStrands": [
        {"name": '5.1 AI Governance and Regulation', "lessons": 9, "keyInquiryQuestion": 'How should Kenya regulate powerful AI systems?'},
        {"name": '5.2 AI Sovereignty and National Strategy', "lessons": 9, "keyInquiryQuestion": 'Should Kenya build its own AI, or buy it?'},
        {"name": '5.3 Existential and Long-Term Risk', "lessons": 9, "keyInquiryQuestion": 'What are the long-term risks of very capable AI?'},
        {"name": '5.4 Exit Capstone: AI Research Project', "lessons": 17, "keyInquiryQuestion": 'What original contribution can we make to AI in Kenya?'},
    ]},
]
