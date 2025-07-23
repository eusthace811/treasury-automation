# Treasury Automation Challenge

This project is an AI-powered chatbot application for managing treasury operations through natural language. It enables users to create, simulate, and schedule complex payment rules with conversational AI, simulating real-world treasury scenarios using mock financial data.

## 🧠 Purpose

* **Primary Goal**: Treasury management automation via chat.
* **Core Feature**: "Chat-as-rule-storage" — rules are embedded directly in chat records.

## 🚀 Stack Overview

| Layer          | Tech Stack                                       |
| -------------- | ------------------------------------------------ |
| Frontend       | React 19, TailwindCSS, shadcn/ui                 |
| Backend        | Next.js 15 (App Router), TypeScript, PostgreSQL  |
| AI Integration | Vercel AI SDK (OpenAI, Anthropic, DeepSeek, xAI) |
| Scheduling     | Upstash QStash for cron + delay execution        |
| ORM & DB       | Drizzle ORM, PostgreSQL                          |
| Observability  | OpenTelemetry, LMNR                              |
| Validation     | Zod                                              |
| Simulation     | Custom treasury rule simulator                   |
| Testing        | Playwright E2E                                   |

## 📁 Key Features

* AI parses user chat into executable treasury rules
* Zod + business validation + conflict detection
* Simulation-first execution for safety
* Rules stored in the chat message record
* Execution scheduling via QStash
* Queue UI for logs, status, and cron schedules

## 📜 Architecture

* Chat input → AI parsing → Rule validation → Simulation → Store rule → QStash schedule → Execution webhook → Result monitoring

Mermaid diagram and deeper explanation in `ARCHITECTURE.md`

# Architecture

## 🧭 Flow Diagram

```mermaid
graph TD
  subgraph User Flow
    A[User Input via Chat UI] --> B[AI: Parse Rule (rule-parser.ts)]
    B --> C[Rule Schema Validation (Zod + Business Logic)]
    C --> D[Conflict Check (rule-evaluator.ts)]
    D --> E[Simulation Engine (simulator.ts)]
    E --> F[Store Rule in chat.ruleData (Postgres)]
    F --> G[QStash Scheduling]
    G --> H[Webhook Trigger]
    H --> I[Execution Logic (context-resolver + evaluator)]
    I --> J[Simulation Result or Future: Real Payment]
  end

  subgraph Monitoring & UI
    G --> K[Schedule Tab UI]
    H --> L[Execution Logs Tab UI]
    J --> M[Real-time Queue Updates]
  end
```

## 📦 Breakdown

### Chat-as-Rule-Storage

* Rules are embedded in the `chats` table as `ruleData` (JSONB)
* No dedicated rule table simplifies context-aware AI interaction

### AI Tooling

Located in `lib/ai/tools/`, each rule goes through:

1. `rule-parser.ts` — NL → JSON
2. `rule-validator.ts` — Zod validation
3. `rule-evaluator.ts` — conflict detection
4. `rule-updater.ts` — stores & syncs to QStash

### Simulation Engine

* `lib/treasury/simulator.ts`
* Performs dry-run validation based on account balances, beneficiaries, and conditions

### Context Resolution

* `context-resolver.ts` maps dynamic entities like `contractors`, `accounts`, and `invoices`

### Scheduling: QStash

* Rules get scheduled via Upstash QStash (`lib/qstash/`)
* Modes:

  * `schedule` → cron-based
  * `once` → delayed single exec

### Webhook Execution

* Triggered by QStash → `app/api/chat/qstash/`
* Verifies conditions → re-runs simulation → logs result

### UI Interfaces

* `/chat/[id]`: Main rule creation interface
* `/queue`: Logs + schedules tabbed UI
* `components/queue/*`: All real-time queue management components


## 🛠 How to Run

See [README.md](../README.md) and [ONBOARDING.md](./ONBOARDING.md).


## 🧩 Extending the Project

This project is built to be extensible. You can integrate real payment processors, expand rule types with new logic or condition handlers, and connect additional data sources for richer treasury context. The AI agent can be extended with new tools or enhanced reasoning models, or any improvements in parsing, validation, or execution flow. You can even build multi-tenant support or embed this system into a broader financial automation suite.


## ❓ Open Tradeoff

> We store rules inside chat messages instead of a dedicated rules table.

**Pros**:

* Unified UX
* Simpler DB schema
* Easier to evolve with conversation

**Cons**:

* Harder to index
* More brittle schema coupling

We chose this to align with the conversational UX and simplify short-term implementation.

## 🔁 Handoff & Next Steps

See [HANDOFF.md](./HANDOFF.md) for what should be documented if this is handed off to another dev or team.

---

This codebase is NOT production ready, but we have a with strong architecture, typed validation, modular AI tools, and a possible clear roadmap for full real-world integration.
