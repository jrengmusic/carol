#!/bin/bash

# Script to create symlinks QWEN.md, GEMINI.md, and AGENTS.md pointing to CLAUDE.md

# Navigate to the script's directory
cd "$(dirname "$0")"

# Create symlinks
ln -sf CLAUDE.md QWEN.md
ln -sf CLAUDE.md GEMINI.md
ln -sf CLAUDE.md AGENTS.md

echo "Symlinks created successfully:"
echo "- QWEN.md -> CLAUDE.md"
echo "- GEMINI.md -> CLAUDE.md"
echo "- AGENTS.md -> CLAUDE.md"