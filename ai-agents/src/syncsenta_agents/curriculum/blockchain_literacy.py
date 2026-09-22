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
