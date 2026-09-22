"""Versioned AI literacy curriculum pack for SyncSenta.

The Grade 6 content is ported from the Lovable-generated
``scheme-scribe-ai`` revision dated 2026-09-22. It is intentionally an
introductory, teacher-mediated pack: no programming, model building, wallets,
transactions, or unsupervised external AI use.
"""

from __future__ import annotations

from typing import Dict, List

from .types import StrandInfo


AI_LITERACY_VERSION = "2026-09-22.grade6.lovable-import.v1"


grade6AILiteracy: List[StrandInfo] = [
    {
        "name": "1.0 Foundations of Intelligence",
        "subStrands": [
            {
                "name": "1.1 What is Intelligence?",
                "lessons": 4,
                "keyInquiryQuestion": "How do we know that something is intelligent?",
                "learningOutcomes": [
                    "identify examples of intelligent behaviour in people, animals and machines",
                    "sort everyday objects into those that behave intelligently and those that do not",
                    "appreciate intelligence found in living things and in machines",
                ],
                "suggestedExperiences": [
                    "Learners name intelligent things they see at home and in school",
                    "Learners sort picture cards into intelligent and not intelligent",
                    "Learners discuss in groups why they placed each card where they did",
                ],
            },
            {
                "name": "1.2 Meaning of Artificial Intelligence",
                "lessons": 4,
                "keyInquiryQuestion": "What does it mean to say a machine is intelligent?",
                "learningOutcomes": [
                    "state the meaning of artificial intelligence in simple terms",
                    "describe simple examples of artificial intelligence in daily life",
                    "show interest in learning about artificial intelligence",
                ],
                "suggestedExperiences": [
                    "Learners listen to a simple explanation of artificial intelligence",
                    "Learners describe an intelligent machine they have seen or used",
                    "Learners draw a chart of intelligent machines in their community",
                ],
            },
            {
                "name": "1.3 Artificial Intelligence Around Us in Kenya",
                "lessons": 4,
                "keyInquiryQuestion": "Where do we meet artificial intelligence in our community?",
                "learningOutcomes": [
                    "identify uses of artificial intelligence in Kenyan homes, farms, hospitals and phones",
                    "match everyday services to the intelligent technology used in them",
                    "appreciate the usefulness of artificial intelligence in daily Kenyan life",
                ],
                "suggestedExperiences": [
                    "Learners list phone and mobile-money features that suggest answers to users",
                    "Learners match pictures of services to the intelligent tools used",
                    "Learners share stories of intelligent technology used by their families",
                ],
            },
        ],
    },
    {
        "name": "2.0 Data and Representation",
        "subStrands": [
            {
                "name": "2.1 Meaning and Sources of Data",
                "lessons": 5,
                "keyInquiryQuestion": "What is data and where does it come from?",
                "learningOutcomes": [
                    "state the meaning of data and name common sources of data",
                    "collect simple data from classmates using a prepared form",
                    "value accuracy when collecting data",
                ],
                "suggestedExperiences": [
                    "Learners name types of data such as numbers, words, pictures and sounds",
                    "Learners collect class data such as favourite fruits or shoe sizes",
                    "Learners record their findings neatly in a table",
                ],
            },
            {
                "name": "2.2 Sorting and Grouping Data",
                "lessons": 5,
                "keyInquiryQuestion": "Why do we group information before using it?",
                "learningOutcomes": [
                    "explain why data is sorted and grouped before use",
                    "sort picture or number cards into labelled groups",
                    "show care and orderliness when organising data",
                ],
                "suggestedExperiences": [
                    "Learners sort picture cards of animals, fruits or vehicles into groups",
                    "Learners label each group and count the items in it",
                    "Learners present their grouped data to the class",
                ],
            },
        ],
    },
    {
        "name": "3.0 AI Techniques and Programming",
        "subStrands": [
            {
                "name": "3.1 Machines Follow Instructions",
                "lessons": 4,
                "keyInquiryQuestion": "How does a machine know what to do?",
                "learningOutcomes": [
                    "explain that machines follow step-by-step instructions given by people",
                    "arrange picture steps into the correct order for a simple task",
                    "appreciate the importance of clear and correct instructions",
                ],
                "suggestedExperiences": [
                    "Learners give a classmate spoken step-by-step instructions for a task",
                    "Learners arrange instruction cards in order for a daily activity",
                    "Learners discuss what happens when a step is missing",
                ],
            },
            {
                "name": "3.2 Teaching a Machine by Example",
                "lessons": 4,
                "keyInquiryQuestion": "How can a machine learn from examples?",
                "learningOutcomes": [
                    "describe how machines learn from many examples shown to them",
                    "demonstrate teaching a machine by grouping example pictures",
                    "appreciate the role of good examples in machine learning",
                ],
                "suggestedExperiences": [
                    "Learners play a guided game where the teacher guesses using examples",
                    "Learners group example pictures into two classes and test the guessing",
                    "Learners discuss why more examples give better guesses",
                ],
            },
            {
                "name": "3.3 Talking and Listening Machines",
                "lessons": 4,
                "keyInquiryQuestion": "How do machines understand what we say?",
                "learningOutcomes": [
                    "identify machines that respond to speech and to typed questions",
                    "demonstrate use of a voice or text assistant to ask a simple question",
                    "value polite and responsible use of talking machines",
                ],
                "suggestedExperiences": [
                    "Learners observe a demonstration of a voice assistant answering a question",
                    "Learners take turns asking clear questions and record the answers",
                    "Learners discuss when the machine answered wrongly and why",
                ],
            },
        ],
    },
    {
        "name": "4.0 AI System Design and Projects",
        "subStrands": [
            {
                "name": "4.1 Spotting Problems Artificial Intelligence Can Help Solve",
                "lessons": 5,
                "keyInquiryQuestion": "Which everyday problems could an intelligent machine help with?",
                "learningOutcomes": [
                    "identify problems in the school or community that intelligent tools could help solve",
                    "describe a simple idea for using an intelligent tool to solve one problem",
                    "appreciate teamwork when looking for solutions to problems",
                ],
                "suggestedExperiences": [
                    "Learners list problems they notice in school such as lost items or litter",
                    "Learners choose one problem and describe an intelligent helper for it",
                    "Learners share their ideas in groups and give feedback to one another",
                ],
            },
            {
                "name": "4.2 Simple Class Project",
                "lessons": 5,
                "keyInquiryQuestion": "How can we show our idea to others?",
                "learningOutcomes": [
                    "describe the parts of their chosen artificial intelligence idea",
                    "prepare a drawing, poster or role-play showing how the idea would work",
                    "show confidence in presenting their own ideas to others",
                ],
                "suggestedExperiences": [
                    "Learners prepare posters or role-plays of their intelligent helper",
                    "Learners present the idea to the class and answer questions",
                    "Learners display the best posters in the classroom or school notice board",
                ],
            },
        ],
    },
    {
        "name": "5.0 Ethics, Society and AI Policy",
        "subStrands": [
            {
                "name": "5.1 Safe Use of Intelligent Tools",
                "lessons": 6,
                "keyInquiryQuestion": "How do we stay safe when using intelligent tools?",
                "learningOutcomes": [
                    "identify safe and unsafe behaviour when using online intelligent tools",
                    "demonstrate safe use of an intelligent tool under supervision",
                    "value personal safety when using digital tools",
                ],
                "suggestedExperiences": [
                    "Learners list safety rules for using phones and computers",
                    "Learners role-play safe and unsafe situations online",
                    "Learners prepare a class safety chart and display it",
                ],
            },
            {
                "name": "5.2 Honesty When Using Artificial Intelligence",
                "lessons": 6,
                "keyInquiryQuestion": "Is it honest to present a machine's work as our own?",
                "learningOutcomes": [
                    "explain why work produced by a machine must be acknowledged",
                    "demonstrate acknowledging help received from an intelligent tool",
                    "commit to honesty in schoolwork",
                ],
                "suggestedExperiences": [
                    "Learners discuss a story about a learner who copied a machine's answer",
                    "Learners practise writing a short note stating where help came from",
                    "Learners agree on a class rule on honest use of intelligent tools",
                ],
            },
            {
                "name": "5.3 Keeping Personal Information Private",
                "lessons": 5,
                "keyInquiryQuestion": "Which information should we never share with a machine?",
                "learningOutcomes": [
                    "identify personal information that should not be shared online",
                    "sort information cards into private and shareable",
                    "show respect for the privacy of self and others",
                ],
                "suggestedExperiences": [
                    "Learners name items of personal information such as names and locations",
                    "Learners sort information cards into private and shareable groups",
                    "Learners discuss how to respond when asked for private information",
                ],
            },
            {
                "name": "5.4 Artificial Intelligence and Our Future Work",
                "lessons": 5,
                "keyInquiryQuestion": "How will intelligent machines change the work we do?",
                "learningOutcomes": [
                    "identify jobs in Kenya that intelligent machines are changing",
                    "describe skills people will need to work alongside intelligent machines",
                    "appreciate the value of learning new skills for the future",
                ],
                "suggestedExperiences": [
                    "Learners interview an adult about changes in their work",
                    "Learners list skills that machines cannot easily replace",
                    "Learners discuss careers they would like in a world with intelligent machines",
                ],
            },
        ],
    },
]


for _strand in grade6AILiteracy:
    for _sub_strand in _strand["subStrands"]:
        _sub_strand["assessmentEvidence"] = [
            f"Teacher observation: learner can explain {_sub_strand['name']}.",
            "Guided-to-independent mastery check using a fictional example.",
            "Short oral, drawing, sorting, or written exit response with reflection.",
        ]
        _sub_strand["prerequisites"] = [
            "Learner can listen to a short model and explain an example in their own words."
        ]
        _sub_strand["misconceptions"] = [
            "A machine output is not automatically true, fair, or intelligent."
        ]
        _sub_strand["safetyNotes"] = [
            "Use fictional or synthetic examples only; never enter learner names, locations, images, or contact details.",
            "Use intelligent tools only through teacher demonstration or an approved offline simulation.",
            "Learners must check, explain, and acknowledge assistance rather than treating output as automatically true.",
        ]


# The same tutor/policy loop is reused for every track. These constraints make
# the progression explicit and prevent an introductory AI pack from becoming a
# crypto or autonomous-agent course.
AI_BLOCKCHAIN_PROGRESSION: Dict[str, Dict[str, object]] = {
    "Grade 6": {
        "ai_level": "recognise_and_use_safely",
        "blockchain_level": "paper_shared_ledger_and_database_comparison",
        "activities": ["sorting", "role_play", "teacher_demonstration", "poster"],
        "requires_teacher_mediation": True,
        "external_actions": False,
        "prohibited": ["wallets", "tokens", "seed_phrases", "real_transactions", "personal_data"],
    },
    "Grade 7-9": {
        "ai_level": "reason_about_data_models_bias_and_evidence",
        "blockchain_level": "hashes_keys_signatures_consensus_and_governance",
        "activities": ["synthetic_data", "source_checking", "low_risk_prototypes", "case_studies"],
        "requires_teacher_mediation": True,
        "external_actions": False,
        "prohibited": ["crypto_trading", "real_wallets", "financial_advice", "immutable_personal_records"],
    },
    "Grade 10-12": {
        "ai_level": "evaluate_systems_and_societal_tradeoffs",
        "blockchain_level": "privacy_security_energy_and_when_not_to_use_blockchain",
        "activities": ["audits", "comparative_design", "research", "defensible_projects"],
        "requires_teacher_mediation": True,
        "external_actions": False,
        "prohibited": ["autonomous_high_stakes_decisions", "real_money", "identity_data_on_public_ledgers"],
    },
}


__all__ = ["AI_LITERACY_VERSION", "grade6AILiteracy", "AI_BLOCKCHAIN_PROGRESSION"]
