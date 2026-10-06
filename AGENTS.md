<!-- OPENSPEC:START -->
# Agents Guide

This document teaches agentic copilots how to work inside `ai-agents-v2`. Keep it alongside the repo and reread when branching into proposal work.

1. **Project Snapshot**
   - Purpose: Ink-based CLI that runs a Laminar-instrumented agent with tool calling, human approvals, and eval harnesses for a Frontend Masters course.
   - Primary entrypoints: `src/index.ts` (render Ink UI), `src/agent/run.ts` (agent loop), `src/ui/App.tsx` (conversation shell).
   - Tooling baseline: Node >= 20, npm, strict TypeScript with ES2022 libs, Biome formatter/linter, tsx for dev.
   - Required env vars: `OPEN_ROUTER_API_KEY`, `LMNR_PROJECT_API_KEY`, optional `MODEL` override (defaults to `gpt-5-mini`). Place them in `.env`, never commit secrets.
   - Output: `npm run build` compiles to `dist/cli.js` consumed by the `agi` bin defined in `package.json`.

2. **Core Commands**
   - `npm install` → install dependencies.
   - `npm run dev` → `tsx watch --env-file=.env src/index.ts`, hot reload for the Ink UI.
   - `npm run start` → single run of `src/index.ts` with `.env` loaded.
   - `npm run build` → `tsc -p tsconfig.build.json`, emits `dist/` with ESM output + type declarations.
   - `npx biome check .` → combined lint/format verification using tab indentation + double quotes (per `biome.json`).
   - `npx biome format <files>` → fix formatting manually; useful when CI failures cite Biome.
   - `npm run eval` → runs the entire Laminar eval suite (`evals/*.eval.ts`).
   - `npm run eval:file-tools` / `npm run eval:shell-tools` / `npm run eval:agent` → targeted eval subsets; use these instead of ad-hoc scripts when testing tool behaviors.
   - **Single-test guidance:** No Jest/Vitest exists. For focused checks, prefer writing a tiny script under `scripts/` or filtering eval datasets (update executor to respect `process.env.EVAL_CASE` if needed). Document any temporary helpers and remove them when done.

3. **Environment & Tooling Expectations**
   - Always load `.env` before running the agent; missing provider keys cause runtime failures (Laminar init + OpenRouter client).
   - Telemetry: `Laminar.initialize` runs in `run.ts`. Do not remove; if you need to stub during tests, add flags rather than deleting instrumentation.
   - Network calls incur cost; wrap destructive tools with gating logic (`ToolApproval`) and respect any HITL prompts from stakeholders.
   - Node version mismatches often show up as `ERR_UNKNOWN_FILE_EXTENSION`; ensure `node --version` matches repo `.nvmrc` (if added later) or document overrides here.

4. **Repo Map**
   - `src/ui/` → Ink components (`MessageList`, `ToolCall`, `ToolApproval`, `Spinner`, `TokenUsage`, `Input`). Keep UI changes consistent with existing style (magenta headers, green assistant text, minimal emoji usage).
   - `src/agent/` → Core orchestration: `run.ts`, `executeTool.ts`, `system/`, `context/`, `tools/`. Any new model/provider logic belongs here.
   - `evals/` → Laminar evaluation harness (datasets, executors, evaluators). Keep deterministic; do not import app-only deps that would explode in CI.
   - `notes/` → Lesson-by-lesson notes for the course (may be populated later). When removing code for a lesson branch, move the snippets here per course workflow.
   - `openspec/` → Spec-driven change management. Whenever a task smells like “plan/spec/proposal/change,” consult this guide plus `openspec/AGENTS.md` before editing code.

5. **OpenSpec Reminder**
   - The repo already contains `openspec/AGENTS.md`; follow it for proposal workflows. Quick cues that you must read it again: user mentions “proposal,” “create a plan/spec,” “architectural change,” or “add a big capability.”
   - Never start implementing large features without an approved proposal. If uncertain, pause and ask.

6. **Formatting & Style Rules**
   - **Formatter:** Biome governs formatting and linting (`biome.json`). Default indent style is tabs; quote style is double quotes. Do not fight the formatter—run `npx biome check .` locally before committing.
   - **Imports:** Use explicit file extensions when importing TS (`import ... from "./foo.ts"`) because `allowImportingTsExtensions` is enabled. Keep type-only imports explicit (`import type { Foo } from "./foo.ts"`).
   - **Module system:** ESM everywhere. Avoid `require`. For CommonJS packages, rely on `esModuleInterop` (already enabled) rather than custom shims.
   - **Types:** `tsconfig.json` uses `strict` mode; define interfaces/types for structured data. Prefer discriminated unions for tool call statuses, avoid `any` except when interacting with third-party SDKs; in those cases, constrain the `any` as close to the boundary as possible.
   - **State management:** UI components use React hooks; keep components pure and avoid side effects outside `useEffect/useInput`. Memoize heavy callbacks with `useCallback` if they get passed down.
   - **Error handling:** Surface user-friendly errors in the UI via assistant messages (`setMessages([...,{ role:"assistant", content: "Error: ..." }])`). When logging server-side, prefer `console.error` with contextual data but avoid leaking secrets (never log full env vars or API responses containing keys).
   - **Naming:** camelCase for functions/variables, PascalCase for components/types, SCREAMING_SNAKE for constants (e.g., `SYSTEM_PROMPT`). Tool names should be descriptive verbs (`getDateTime`, `readFile`), and file names should match their primary export.
   - **Comments:** Only when behavior is non-obvious. Focus on “why,” not “what.” Remove outdated comments aggressively.
   - **Dead code:** Delete unused imports/functions immediately; Biome’s linter will usually catch them.

7. **Testing & Evaluation Guidance**
   - There is no Jest/Vitest. Validation currently relies on LMNR evals plus manual runs of the Ink CLI.
   - Keep eval datasets deterministic—mock tool outputs or use synthetic data under `evals/mocks/` so CI does not depend on live APIs.
   - When adding new tools/flows, extend the eval suite (copy an existing `.eval.ts` file) instead of leaving gaps.
   - For quick smoke tests, run `npm run start` and type prompts manually. Document any necessary setup steps inside PR descriptions or in `notes/`.

8. **Tooling Policies (Cursor/Copilot)**
   - The repo currently has **no** `.cursor/rules` or `.github/copilot-instructions.md`. If you add such rule files later, summarize them here so other agents inherit the guidance.
   - Until then, default to the rules in this file plus Biome/TypeScript configs.

9. **Git & Branching**
   - Never use destructive commands (`git reset --hard`, `git clean -fd`) unless the user explicitly requests it.
   - Follow the course workflow: `done` branch mirrors the finished app, each lesson branch contains the solution for the previous lesson. When backporting code for lesson prep, copy removed code into the corresponding `notes/XX-*.md` file before deleting from source.
   - Commit only when the user asks. Respect repo-specific commit message style uncovered via `git log` (typically imperative, short).

10. **Human-in-the-loop (HITL)**
   - UI already ships a `ToolApproval` component. When wiring new tools that can read/write files, run shell commands, or perform web requests, integrate approval hooks so humans can gate risky actions.
   - The Ink UI shows active tool calls; keep results concise (truncate long outputs, e.g., first 100 chars plus ellipsis).

11. **Context Management Helpers**
   - `src/agent/context/tokenEstimator.ts` provides `estimateTokens` and `estimateMessagesTokens`; keep them cheap and side-effect free.
   - `modelLimits.ts` defines thresholds for GPT-5 variants. Update this table if you add new models; ensure `isOverThreshold` and `calculateUsagePercentage` stay deterministic.
   - `compaction.ts` will summarize conversations to stay within context limits. When implementing, keep prompts in-lined constants near the top, and respect `ModelMessage` typing.

12. **Tool Development Guidelines**
   - Place reusable tool builders under `src/agent/tools/`. Each tool should export `tool({ description, inputSchema, execute })` from the Vercel AI SDK.
   - Keep tool inputs validated with `zod`; do not accept raw strings when structured input makes sense.
   - If a tool needs filesystem or shell access, wrap it with permission checks + user confirmation.
   - Update `tools/index.ts` to export newly added tools, and ensure `executeTool.ts` can dispatch to them.

13. **UI/UX Conventions**
   - CLI header: magenta “🤖 AI Agent” plus dim “type "exit" to quit.” Preserve for consistency unless the assignment explicitly wants rebranding.
   - Streaming responses show a green `› Assistant` label with a pulsing block. Maintain the same pattern when changing streaming logic.
   - Keep interface accessible: rely on text + color; avoid ASCII art that breaks small terminals.

14. **Documentation Expectations**
   - If you add env vars, commands, or workflows, update this file plus any relevant README/notes. The repo currently lacks a README—feel free to add one when requested, but keep this guide authoritative for contributors.
   - When editing lesson notes, follow the template given in `course.yaml` description (overview, key concepts, code blocks, exercises).

15. **When in Doubt**
   - If requirements mention “proposal/spec/change/plan,” reopen `openspec/AGENTS.md` for authoritative instructions.
   - Failing tests/evals should be fixed before responding unless the user explicitly wants the failure details first.
   - Ask questions only when blocked; otherwise choose sensible defaults aligned with existing patterns and document them in your final response.

Stay disciplined, keep changes minimal, and rely on this guide to stay consistent with the existing codebase.

<!-- OPENSPEC:END -->
