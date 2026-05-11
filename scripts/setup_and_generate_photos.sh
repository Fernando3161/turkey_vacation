#!/usr/bin/env bash
# Generate website-ready photos.
#
# Usage:
#   scripts/setup_and_generate_photos.sh
#   python scripts/generate_web_photos.py --force
#   python scripts/generate_web_photos.py --prune

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$REPO_ROOT/.venv"

cd "$REPO_ROOT"

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment at $VENV_DIR"
  if command -v python3 >/dev/null 2>&1; then
    python3 -m venv "$VENV_DIR"
  else
    python -m venv "$VENV_DIR"
  fi
fi

echo "Activating virtual environment"
if [ -f "$VENV_DIR/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
elif [ -f "$VENV_DIR/Scripts/activate" ]; then
  # shellcheck disable=SC1091
  source "$VENV_DIR/Scripts/activate"
else
  echo "Could not find virtual environment activation script." >&2
  exit 1
fi

echo "Installing dependencies from requirements.txt"
python -m pip install --upgrade pip
python -m pip install -r "$REPO_ROOT/requirements.txt"

echo "Generating web photos"
python "$SCRIPT_DIR/generate_web_photos.py"
