# Handoff Notes

If you're taking over the Treasury Automation project, here are the key areas to understand and maintain:

---

## 📌 What You Need to Know

### Rule Lifecycle

* Starts with chat input
* Parsed to `ruleData` via `rule-parser.ts`
* Validated and evaluated
* Stored in the `chats` table with:

  * `ruleData`: Structured JSON
  * `memo`, `scheduleId`, `isActive`
* Scheduled with QStash (`lib/qstash/`)

### Execution Flow

* QStash webhook → verify schedule + re-validate rule (fake, incomplete execution)
* Run simulation again before committing (real execution not yet implemented)
* Log result into queue log

### Important Entities

* **Users**: Authentication
* **Chats**: Store rules
* **Accounts/Invoices/Beneficiaries/Treasury**: Financial mockup data / context
* **QStash Schedules/Logs**: Execution lifecycle

### Schema Overview

* `lib/treasury/schema.ts`: Strong Zod definitions
* `lib/treasury/types.ts`: TypeScript-first treasury types
* Supports `simple`, `split`, `batch`, `calculation`, `leftover` payment types

---

## 🔍 If You’re Auditing/Refactoring

* Watch out for assumptions in `context-resolver.ts`
* Trace how formula-based amounts resolve using `formula-evaluator.ts`
* Be careful modifying chat schema; rules live in JSONB

---

## 🧱 Suggestions for Improvements

* Add audit logging and event history
* Isolate `chat.ruleData` into a reusable service layer
* Add support for org-based multi-tenancy

---

## 🧑‍🏫 Recommended Reading Order

1. [README.md](../README.md)
2. [ARCHITECTURE.md](./ARCHITECTURE.md)
3. [ONBOARDING.md](./ONBOARDING.md)
4. `lib/ai/tools/`
5. `lib/treasury/`
6. `app/api/chat/`

## 📌 Links

1. [ARCHITECTURE.md](./ARCHITECTURE.md)
2. [ONBOARDING.md](./ONBOARDING.md)
3. [HANDOFF.md](./HANDOFF.md)

---

Feel free to refactor this document as the codebase evolves.
