---
name: capture
description: Append a fix, feature, or idea to docs/BACKLOG.md. Use when the user says /capture, "backlog this", "note this", or when an out-of-scope issue worth recording surfaces mid-work.
argument-hint: "<one-line description of the fix/feature/idea>"
---

Append the item to `docs/BACKLOG.md`:

1. Classify into **Fixes** (broken, regressed, or technical debt), **Features** (new
   user-facing capability), or **Ideas** (unvalidated thought). If ambiguous, pick the
   closest — do not ask.
2. Append one line at the end of that section: `- [ ] <description> (<YYYY-MM-DD>)`.
   Keep the user's wording, compressed to one line; add a `file:line` or route pointer
   when one is known.
3. Do not commit — the line rides the user's next commit.
4. Confirm with the section name and the exact line added.

Rules:
- Never rewrite, reorder, or delete existing lines during capture.
- Lines are deleted only when an item ships or graduates into a `specs/<feature>/` plan.
- Proactive captures (not user-requested) must be listed in the session's final summary.
