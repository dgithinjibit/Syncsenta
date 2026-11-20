import re
import unittest
from pathlib import Path

from syncsenta_agents.omega_routing import AGENT_ROUTES, resolve_agent_route


class OmegaRoutingTests(unittest.TestCase):
    def test_student_defaults_to_socratic_tutor(self):
        self.assertEqual(resolve_agent_route("student", None), "socratic_tutor")

    def test_teacher_lesson_planning_routes_to_lesson_architect(self):
        self.assertEqual(
            resolve_agent_route("teacher", "lesson_planning"),
            "lesson_architect",
        )

    def test_institution_head_alias_routes_to_school_intelligence(self):
        self.assertEqual(
            resolve_agent_route("head_of_institution", None),
            "school_intelligence",
        )

    def test_role_and_task_labels_accept_spaces(self):
        self.assertEqual(
            resolve_agent_route("head of institution", None),
            "school_intelligence",
        )
        self.assertEqual(
            resolve_agent_route("teacher", "lesson planning"),
            "lesson_architect",
        )

    def test_student_cannot_route_to_school_intelligence(self):
        with self.assertRaises(ValueError):
            resolve_agent_route("student", "school_intelligence")

    def test_unsupported_task_is_rejected(self):
        with self.assertRaises(ValueError):
            resolve_agent_route("teacher", "school_intelligence")

    def test_unknown_role_is_rejected_instead_of_defaulting_to_student(self):
        with self.assertRaises(ValueError):
            resolve_agent_route("parent", None)

    def test_python_fallback_routes_match_metta_policy(self):
        policy_path = (
            Path(__file__).resolve().parents[2]
            / "metta-logic"
            / "syncsenta_policy.metta"
        )
        policy_text = policy_path.read_text(encoding="utf-8")
        route_rules = {
            (role, task): agent
            for role, task, agent in re.findall(
                r"^\(= \(omega-agent-route ([\w-]+) ([\w-]+)\) ([\w-]+)\)$",
                policy_text,
                re.MULTILINE,
            )
        }
        self.assertEqual(route_rules, AGENT_ROUTES)


if __name__ == "__main__":
    unittest.main()
