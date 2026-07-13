# AGENTS.md

This file provides guidance to agents when working with code in this repository.

Refer to @CLAUDE.md for general guidance on how to work with agents

### For Codex

- Do not run dev servers in the agent environment unless explicitly instructed to do so by the user. Check commands such as build or type-check are allowed when needed for verification.
- Commits require explicit user instruction, except during a user-authorized `spec-phase` run: commits required by that workflow are pre-authorized. `spec-plan` and all other work still require explicit commit instruction.
