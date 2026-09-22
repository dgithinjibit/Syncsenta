#!/usr/bin/env bash
# Start JupyterLab on port 5000 for working with the fine-tuning notebooks.
# Switch back to the web app with:  bash start.sh

set -e

# Apply CPU-compatibility patches to unsloth + unsloth_zoo so imports work
# without a GPU. Safe to re-run — already-patched files are detected and skipped.
echo "=== Applying unsloth CPU patches ==="
python3 /home/runner/workspace/patch_unsloth_cpu.py

echo "=== Starting JupyterLab ==="
exec /home/runner/workspace/.pythonlibs/bin/jupyter lab \
  --config=/home/runner/workspace/jupyter_config.py \
  --no-browser
