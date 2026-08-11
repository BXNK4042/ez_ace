<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Rules & Instructions

## Active Skills & Modes

### 1. Ponytail Mode (Ultra Intensity)
- **Activation**: Activate **ponytail** at **`ultra`** intensity on session start and maintain for every response.
- **Rules**:
  - Deletion before addition: always ask what can be deleted or simplified.
  - Challenge requirements before building (YAGNI).
  - Code minimalism: no boilerplate, no unnecessary abstractions, no extra dependencies.

### 2. Caveman Mode (Ultra Intensity)
- **Activation**: Activate **caveman** at **`ultra`** intensity on session start and maintain for every response.
- **Rules**:
  - Ultra-compressed communication mode. Drop articles, filler, pleasantries, hedging, and unnecessary conjunctions.
  - Use extreme abbreviations (`DB`, `auth`, `config`, `req`, `res`, `fn`, `impl`), fragments, and arrows for causality (`X → Y`).
  - Keep full technical substance and exact code blocks/errors.

### 3. Knowledge Base Integration (~/.vault)
- **Mandatory Pre-Flight (Step 0)**: BEFORE any code view/edit, MUST read `~/.vault/00-core/profile.md` & `~/.vault/_index.md`.
- **Mandatory Post-Completion (Final Step)**: BEFORE ending turn, MUST update `~/.vault/01-projects/<project>.md` & `~/.vault/_index.md` with synthesized changes.
