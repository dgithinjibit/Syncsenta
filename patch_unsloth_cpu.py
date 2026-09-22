"""
Patches unsloth + unsloth_zoo to work on CPU-only machines (Replit / CI — no GPU).

What the patches do
-------------------
1. unsloth_zoo/device_type.py  — return "cpu" instead of raising NotImplementedError
2. unsloth_zoo/temporary_patches/gpt_oss.py — guard memory probe against non-CUDA builds
3. unsloth/__init__.py         — skip triton + GPU model imports; inject a FastLanguageModel
                                  stub that raises a clear "GPU required" error if called

With these patches:
  • `from unsloth import FastLanguageModel` succeeds on CPU
  • Data-prep cells (dataset building, tokenisation stubs) run locally
  • Calling FastLanguageModel.from_pretrained() gives a clear "need GPU" message
  • The full training pipeline (Cells 2-4) still needs Google Colab T4

Run after installing / upgrading unsloth / unsloth_zoo:
    python3 patch_unsloth_cpu.py

Safe to re-run — already-patched files are detected and skipped.
"""

import sys
import pathlib
import shutil
import importlib.util

SENTINEL = "# CPU-only fallback (Replit / CI"

def _find_pkg(name: str) -> pathlib.Path | None:
    spec = importlib.util.find_spec(name)
    if spec is None:
        return None
    locs = spec.submodule_search_locations
    return pathlib.Path(locs[0]) if locs else None


def _clear_pycache(pkg_dir: pathlib.Path) -> None:
    for pc in pkg_dir.rglob("__pycache__"):
        shutil.rmtree(pc, ignore_errors=True)


def patch_unsloth_zoo() -> None:
    pkg = _find_pkg("unsloth_zoo")
    if pkg is None:
        print("unsloth_zoo not installed — skipping")
        return

    # ── 1a. device_type.py ──────────────────────────────────────────────────
    dt = pkg / "device_type.py"
    src = dt.read_text()
    if SENTINEL in src:
        print("unsloth_zoo/device_type.py already patched")
    else:
        src = src.replace(
            'raise NotImplementedError("Unsloth cannot find any torch accelerator? You need a GPU.")',
            '# CPU-only fallback (Replit / CI — no GPU)\n            return "cpu"',
        )
        src = src.replace(
            'raise NotImplementedError("Unsloth currently only works on NVIDIA, AMD and Intel GPUs.")',
            '# CPU-only fallback (Replit / CI — no GPU)\n    return "cpu"',
        )
        dt.write_text(src)
        print("unsloth_zoo/device_type.py patched OK")

    # ── 1b. temporary_patches/gpt_oss.py ────────────────────────────────────
    gpt = pkg / "temporary_patches" / "gpt_oss.py"
    src = gpt.read_text()
    OLD = (
        'if DEVICE_TYPE == "xpu":\n'
        '    device_memory = torch.xpu.memory.mem_get_info(0)[-1]\n'
        'else:\n'
        '    device_memory = torch.cuda.memory.mem_get_info(0)[-1]'
    )
    NEW = (
        'if DEVICE_TYPE == "xpu":\n'
        '    device_memory = torch.xpu.memory.mem_get_info(0)[-1]\n'
        'elif DEVICE_TYPE == "cpu":\n'
        '    device_memory = 40 * 1024 * 1024 * 1024  # pretend 40 GB so combo kernels are off\n'
        'else:\n'
        '    device_memory = torch.cuda.memory.mem_get_info(0)[-1]'
    )
    if SENTINEL in src or OLD not in src:
        print("unsloth_zoo/temporary_patches/gpt_oss.py already patched or snippet not found")
    else:
        gpt.write_text(src.replace(OLD, NEW, 1))
        print("unsloth_zoo/temporary_patches/gpt_oss.py patched OK")

    _clear_pycache(pkg)


def patch_unsloth() -> None:
    pkg = _find_pkg("unsloth")
    if pkg is None:
        print("unsloth not installed — skipping")
        return

    init = pkg / "__init__.py"
    src = init.read_text()

    if SENTINEL in src:
        print("unsloth/__init__.py already patched")
        return

    # ── Patch A: SUPPORTS_BFLOAT16 cpu branch + triton guard ────────────────
    OLD_A = (
        'elif DEVICE_TYPE == "xpu":\n'
        '    # torch.xpu.is_bf16_supported() does not have including_emulation\n'
        '    # set SUPPORTS_BFLOAT16 as torch.xpu.is_bf16_supported()\n'
        '    SUPPORTS_BFLOAT16 = torch.xpu.is_bf16_supported()\n'
        '\n'
        '# For Gradio HF Spaces?\n'
        '# if "SPACE_AUTHOR_NAME" not in os.environ and "SPACE_REPO_NAME" not in os.environ:\n'
        'import triton'
    )
    NEW_A = (
        'elif DEVICE_TYPE == "xpu":\n'
        '    # torch.xpu.is_bf16_supported() does not have including_emulation\n'
        '    # set SUPPORTS_BFLOAT16 as torch.xpu.is_bf16_supported()\n'
        '    SUPPORTS_BFLOAT16 = torch.xpu.is_bf16_supported()\n'
        'elif DEVICE_TYPE == "cpu":\n'
        '    # CPU-only fallback (Replit / CI — no GPU available)\n'
        '    SUPPORTS_BFLOAT16 = False\n'
        '\n'
        '# For Gradio HF Spaces?\n'
        '# if "SPACE_AUTHOR_NAME" not in os.environ and "SPACE_REPO_NAME" not in os.environ:\n'
        'if DEVICE_TYPE != "cpu":\n'
        '    import triton'
    )
    if OLD_A in src:
        src = src.replace(OLD_A, NEW_A, 1)
        print("unsloth/__init__.py patch A (SUPPORTS_BFLOAT16 + triton): OK")
    else:
        print("unsloth/__init__.py patch A: snippet not found — check unsloth version")

    # ── Patch B: guard model imports; inject FastLanguageModel CPU stub ──────
    OLD_B = (
        'from .models import *\n'
        'from .models import __version__\n'
        'from .save import *\n'
        'from .chat_templates import *\n'
        'from .tokenizer_utils import *\n'
        'from .trainer import *'
    )
    NEW_B = (
        'if DEVICE_TYPE != "cpu":\n'
        '    from .models import *\n'
        '    from .models import __version__\n'
        '    from .save import *\n'
        '    from .chat_templates import *\n'
        '    from .tokenizer_utils import *\n'
        '    from .trainer import *\n'
        'else:\n'
        '    # CPU stub — GPU model features are unavailable; data-prep cells work fine\n'
        '    __version__ = "cpu-stub"\n'
        '\n'
        '    class _CPUStub:\n'
        '        """Stub raised when FastLanguageModel is used without a GPU."""\n'
        '        _name = "FastLanguageModel"\n'
        '        def __init__(self, *a, **kw):\n'
        '            raise RuntimeError(\n'
        '                "Unsloth: FastLanguageModel requires a GPU (CUDA/ROCm/XPU).\\n"\n'
        '                "Run this notebook on Google Colab (T4 GPU) for model loading & training.\\n"\n'
        '                "Data-prep cells (dataset building) work locally without a GPU."\n'
        '            )\n'
        '        @classmethod\n'
        '        def from_pretrained(cls, *a, **kw):\n'
        '            raise RuntimeError(\n'
        '                "Unsloth: FastLanguageModel requires a GPU.\\n"\n'
        '                "Run this notebook on Google Colab (T4 GPU)."\n'
        '            )\n'
        '        @classmethod\n'
        '        def get_peft_model(cls, *a, **kw):\n'
        '            raise RuntimeError("Unsloth: GPU required.")\n'
        '        @staticmethod\n'
        '        def for_inference(model):\n'
        '            raise RuntimeError("Unsloth: GPU required.")\n'
        '\n'
        '    FastLanguageModel = _CPUStub\n'
        '    FastModel         = _CPUStub\n'
        '    FastVisionModel   = _CPUStub\n'
        '    FastTextModel     = _CPUStub'
    )
    if OLD_B in src:
        src = src.replace(OLD_B, NEW_B, 1)
        print("unsloth/__init__.py patch B (model imports + CPU stub): OK")
    else:
        print("unsloth/__init__.py patch B: snippet not found — check unsloth version")

    # ── Patch C: guard dataprep + rl_environments ────────────────────────────
    OLD_C = (
        '# Export dataprep utilities for CLI and downstream users\n'
        'from .dataprep.raw_text import RawTextDataLoader, TextPreprocessor\n'
        'from unsloth_zoo.rl_environments import (\n'
        '    check_python_modules,\n'
        '    create_locked_down_function,\n'
        '    execute_with_time_limit,\n'
        '    Benchmarker,\n'
        '    is_port_open,\n'
        '    launch_openenv,\n'
        ')\n'
        '\n'
        '# Patch TRL trainers for backwards compatibility\n'
        '_patch_trl_trainer()'
    )
    NEW_C = (
        '# Export dataprep utilities for CLI and downstream users\n'
        'if DEVICE_TYPE != "cpu":\n'
        '    from .dataprep.raw_text import RawTextDataLoader, TextPreprocessor\n'
        '    from unsloth_zoo.rl_environments import (\n'
        '        check_python_modules,\n'
        '        create_locked_down_function,\n'
        '        execute_with_time_limit,\n'
        '        Benchmarker,\n'
        '        is_port_open,\n'
        '        launch_openenv,\n'
        '    )\n'
        '\n'
        '    # Patch TRL trainers for backwards compatibility\n'
        '    _patch_trl_trainer()'
    )
    if OLD_C in src:
        src = src.replace(OLD_C, NEW_C, 1)
        print("unsloth/__init__.py patch C (dataprep + rl_environments): OK")
    else:
        print("unsloth/__init__.py patch C: snippet not found — skipping (non-critical)")

    init.write_text(src)
    _clear_pycache(pkg)
    print("unsloth/__init__.py written OK")


if __name__ == "__main__":
    print("=== Patching unsloth for CPU-only environments ===")
    patch_unsloth_zoo()
    patch_unsloth()
    print("\nDone. Test with:")
    print("  python3 -c \"from unsloth import FastLanguageModel; print('OK')\"")
