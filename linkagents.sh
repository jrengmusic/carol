#!/bin/bash

# Script to create symlinks QWEN.md, GEMINI.md, and CLAUDE.md pointing to AGENTS.md

# Navigate to the script's directory
cd "$(dirname "$0")"

# Create symlinks
ln -sf AGENTS.md QWEN.md
ln -sf AGENTS.md GEMINI.md
ln -sf AGENTS.md CLAUDE.md

echo "Symlinks created successfully:"
echo "- QWEN.md -> AGENTS.md"
echo "- GEMINI.md -> AGENTS.md"
echo "- CLAUDE.md -> AGENTS.md"
