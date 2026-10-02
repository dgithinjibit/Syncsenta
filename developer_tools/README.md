# Developer Tools

This directory contains scripts and examples used to develop, inspect, test, generate, or operate SyncSenta. These files are not imported by the learner or teacher web application.

- `scripts/`: repository-level checks, the MeTTa CLI, curriculum/design generators, staging helpers, and data utilities.
- `ai-agents/scripts/`: model deployment, database setup, training-data preparation, curriculum transpilation, and parity checks for the Python agent service.
- `ai-agents/examples/`: standalone development demos for the Python agent service.

Production application code stays in `studio/`, `ai-agents/src/`, `backend/`, and the Rust service crates. Tests remain beside their owning package so the existing test runners continue to discover them. The root `scripts/` and former `ai-agents/scripts/` paths are compatibility symlinks during this reorganization.