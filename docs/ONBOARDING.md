# Developer Onboarding Guide

Welcome to the Treasury Automation codebase. This guide will help new engineers set up, understand, and extend the project efficiently.

## ✅ Setup Checklist

### 1. Clone the repo & install dependencies

```bash
git clone https://github.com/eusthace811/treasury-automation.git
cd treasury-automation
```

### 2. Set up your `.env`

```bash
cp .env.example .env.local
```

To generate a random secret for AUTH_SECRET, run:

```bash
openssl rand -base64 32
```

Then update your .env.local file with credentials:

```
AUTH_SECRET=your-secret
OPENAI_API_KEY=sk-...
POSTGRES_URL=postgresql://...
API_KEY_PROVIDER=openai
QSTASH_URL=https://...
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
BLOB_READ_WRITE_TOKEN=...
...
```

### 3. Run database migrations

```bash
pnpm run db:migrate
```

### 4. Start the development server

```bash
pnpm dev
```

---

## 🛠 Key Files to Know

| Path                | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `lib/ai/tools/`     | Core AI rule lifecycle: parse, validate, evaluate    |
| `lib/treasury/`     | Domain logic: schema, simulation, context resolution |
| `app/api/chat/`     | Chat APIs                   |

## 🧪 Debugging

* To debug, you can use Visual Studio Code's built-in support for running Node.js apps with breakpoints. For more details, see the [Next.js debugging guide](https://nextjs.org/docs/app/guides/debugging).

## 🔄 First Extensions

| Task                 | Files to Modify                            |
| -------------------- | ------------------------------------------ |
| Add new payment type | `schema.ts`, `simulator.ts`                |
| Add new AI tool      | `lib/ai/tools/`, update `models.ts`        |
| Add new UI component | `components/`, follow shadcn/ui convention |

## 👣 Suggested First timers

* Walk through: parser → validator → simulator → test via chat UI

## 📌 Links

1. [ARCHITECTURE.md](./ARCHITECTURE.md)
2. [ONBOARDING.md](./ONBOARDING.md)
3. [HANDOFF.md](./HANDOFF.md)

Welcome aboard!
