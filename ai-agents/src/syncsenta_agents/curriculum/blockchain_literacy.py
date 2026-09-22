"""Backend Blockchain Literacy identifiers for scheme generation."""

from __future__ import annotations

from typing import List

from .types import StrandInfo


def _pack(strands: list[tuple[str, list[tuple[str, int, str]]]]) -> List[StrandInfo]:
    return [
        {
            "name": strand_name,
            "subStrands": [
                {"name": name, "lessons": lessons, "keyInquiryQuestion": inquiry}
                for name, lessons, inquiry in sub_strands
            ],
        }
        for strand_name, sub_strands in strands
    ]


grade6BlockchainLiteracy = _pack([
    ("1.0 Records and Trust", [("1.1 Events and Records", 4, "What is the difference between something happening and recording it?"), ("1.2 Who Can See or Change a Record?", 4, "Who should be trusted with a record?")]),
    ("2.0 Shared Ledgers", [("2.1 Paper Shared Ledger", 5, "How can a group keep matching records?"), ("2.2 Rules and Verification", 5, "How do we check whether a new entry follows the rules?")]),
    ("3.0 Linked Records and Blockchain", [("3.1 Linked Paper Blocks", 5, "What happens when records refer to earlier records?"), ("3.2 Blockchain Is Not Cryptocurrency", 5, "How is a shared record different from money?")]),
    ("4.0 Choosing the Right Record System", [("4.1 Database or Shared Ledger?", 5, "When is a normal database better?"), ("4.2 Accuracy, Privacy, and Access", 5, "Can a system be secure and still contain wrong information?")]),
    ("5.0 Responsible Community Projects", [("5.1 Community Record Proposal", 5, "What record could help our community, and what could go wrong?"), ("5.2 Explain, Review, Improve", 4, "How can we improve an idea after feedback?")]),
])

# Rich, low-resource experiences are kept in the backend pack as well as the
# teacher UI so the scheme prompt can render them instead of inventing online
# activities. All records and values are fictional.
_grade6_experiences = {
    "2.1 Paper Shared Ledger": [
        "Ledger relay: each group adds one fictional entry, passes its copy, and checks whether the next group recorded the same entry.",
        "Human checksum: pairs read the same three entries aloud, circle differences, and agree on a correction without erasing the original.",
        "Use bottle tops, beans, or stones as counters to act out additions and removals before writing the entry.",
    ],
    "2.2 Rules and Verification": [
        "Verification stations: check date, owner, quantity, and reason using four paper stations.",
        "Tamper detective: the teacher changes one copied card while learners use a checklist to find the mismatch.",
        "Consensus corners: learners stand by Accept, Reject, or Ask for Clarification and give one reason.",
    ],
    "3.1 Linked Paper Blocks": [
        "Block builder: teams make cards with entry, previous-card number, verifier mark, and a simple colour pattern.",
        "Link-and-pass relay: each team adds a block, reads the previous reference aloud, and passes the chain to another team.",
        "Tamper hunt: secretly alter one earlier card, then let teams trace which later links no longer agree.",
        "Repair without rewriting: learners attach a correction card and explain why an old record remains visible.",
        "Chain freeze: groups point to the first block, latest block, and the link that connects them.",
        "Exit ticket: explain what linking helps us notice and what it cannot prove.",
    ],
    "3.2 Blockchain Is Not Cryptocurrency": [
        "Human ledger versus blockchain drama: learners act as record keepers, verifiers, and observers.",
        "Sort picture cards into record, payment, identity, or unsafe request without using real accounts.",
        "Myth–evidence line: learners place statements on Agree, Unsure, or Disagree and justify the placement.",
    ],
}
_grade6_outcomes = {
    "2.1 Paper Shared Ledger": [
        "explain a shared ledger using a classroom example",
        "create and compare matching fictional paper-ledger copies",
        "cooperate when checking an entry and correcting a mismatch",
    ],
    "2.2 Rules and Verification": [
        "state simple rules for accepting a record",
        "verify a fictional entry against an agreed rule",
        "explain why checking is different from trusting blindly",
    ],
    "3.1 Linked Paper Blocks": [
        "describe a block as a group of linked fictional records",
        "show how changing an earlier card affects later links",
        "recognise that linking provides tamper evidence but does not make information true",
    ],
    "3.2 Blockchain Is Not Cryptocurrency": [
        "distinguish blockchain record-keeping from cryptocurrency and investment",
        "give one safe educational example of a shared record",
        "reject wallet, token, trading, or credential requests in a classroom scenario",
    ],
}
for _strand in grade6BlockchainLiteracy:
    for _sub_strand in _strand["subStrands"]:
        _sub_strand.setdefault("learningOutcomes", [
            f"explain the main idea of {_sub_strand['name']}",
            f"apply {_sub_strand['name']} to a fictional classroom example",
            "show care for accuracy, privacy, and human review",
        ])
        _sub_strand.setdefault("suggestedExperiences", [
            "Listen to a teacher model using paper cards and repeat the key rule.",
            "Complete a guided fictional-record practice with a partner.",
            "Complete a short independent mastery check and explain one choice.",
        ])
        _sub_strand["assessmentEvidence"] = [
            f"Teacher observation: learner can explain {_sub_strand['name']}.",
            "Guided-to-independent mastery check using a fictional classroom record.",
            "Short oral, drawing, sorting, or written exit response with reflection.",
        ]
        _sub_strand["prerequisites"] = [
            "Learner can listen to a short model and explain an example in their own words."
        ]
        _sub_strand["misconceptions"] = [
            "A linked or shared record is not automatically true and is not cryptocurrency."
        ]
        _sub_strand["safetyNotes"] = [
            "Use paper records and fictional entries only; never create wallets, tokens, accounts, or real transactions.",
            "Never request passwords, PINs, seed phrases, private keys, identity records, or private financial information.",
            "Include a human correction and review route for every classroom record.",
        ]
        if _sub_strand["name"] in _grade6_experiences:
            _sub_strand["learningOutcomes"] = _grade6_outcomes[_sub_strand["name"]]
            _sub_strand["suggestedExperiences"] = _grade6_experiences[_sub_strand["name"]]


def _junior(grade: int) -> List[StrandInfo]:
    return _pack([
        ("1.0 Data, Records, and Trust", [("1.1 Data Provenance and Claims", 5, "Where did this record come from, and what claim does it support?"), ("1.2 Identity, Privacy, and Access", 5, "Who should control access to a record?")]),
        ("2.0 Blockchain Mechanics", [("2.1 Hashes and Tamper Evidence", 6, "How can a small change make a record mismatch?"), ("2.2 Keys, Signatures, and Verification", 6, "How can a system check who approved an entry?")]),
        ("3.0 Consensus and Governance", [("3.1 Agreement Under Rules", 6, "How can a group agree on the next record?"), ("3.2 Governance and Accountability", 6, "Who can change the rules when the system causes harm?")]),
        ("4.0 System Choice and Social Impact", [("4.1 When Not to Use Blockchain", 6, "What makes a normal database the better choice?"), ("4.2 Inclusion, Energy, and Access", 6, "Who may be helped or excluded by this system?")]),
        ("5.0 Evidence-Based Project", [("5.1 Comparative Design Project", 7, "Which record system best fits this fictional problem?"), ("5.2 Review, Revision, and Defence", 7, "How do we defend a design while admitting uncertainty?")]),
    ])


def _senior(grade: int) -> List[StrandInfo]:
    return _pack([
        ("1.0 Distributed Systems Foundations", [("1.1 State, Replication, and Provenance", 6, "How do independent systems maintain a shared view?"), ("1.2 Threat Models and Trust Boundaries", 6, "What can fail even when the ledger is functioning?")]),
        ("2.0 Cryptographic Building Blocks", [("2.1 Hashes, Merkle Structures, and Integrity", 7, "How can systems detect change efficiently?"), ("2.2 Signatures, Keys, and Privacy", 7, "How should approval and secrecy be separated?")]),
        ("3.0 Consensus, Smart Contracts, and Governance", [("3.1 Consensus and Incentive Trade-offs", 7, "What does a consensus mechanism optimise, and at what cost?"), ("3.2 Contract Rules and Human Oversight", 7, "When should an automated rule stop and ask a person?")]),
        ("4.0 Architecture, Regulation, and Impact", [("4.1 Architecture and Interoperability", 7, "Which components should be shared, private, or off-chain?"), ("4.2 Regulation, Ethics, and Public Interest", 7, "What makes a distributed system legitimate and accountable?")]),
        ("5.0 Capstone Research and Evaluation", [("5.1 System Evaluation Project", 8, "Does this problem need a distributed ledger?"), ("5.2 Defence, Reflection, and Safe Handoff", 8, "How should a technical proposal be handed to accountable people?")]),
    ])


grade7BlockchainLiteracy = _junior(7)
grade8BlockchainLiteracy = _junior(8)
grade9BlockchainLiteracy = _junior(9)
grade10BlockchainLiteracy = _senior(10)
grade11BlockchainLiteracy = _senior(11)
grade12BlockchainLiteracy = _senior(12)

__all__ = [
    "grade6BlockchainLiteracy", "grade7BlockchainLiteracy", "grade8BlockchainLiteracy",
    "grade9BlockchainLiteracy", "grade10BlockchainLiteracy", "grade11BlockchainLiteracy",
    "grade12BlockchainLiteracy",
]
