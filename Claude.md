# Claude.md - Treasury Automation Project Memory

## Project Overview

**Treasury Automation** is an AI-powered chatbot application designed to help users manage treasury operations through natural language interactions. Built on the Vercel AI Chatbot template, it enables users to "schedule payments, review rules, or simulate a payout" using plain English commands.

### Core Purpose
- **Primary Function**: Treasury management automation through conversational AI
- **User Experience**: Natural language interface for complex financial operations
- **Target Use Cases**: Payment scheduling, rule review, payout simulation

## Technical Architecture

### Framework & Core Technologies
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Library**: React 19 (RC)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js v5 (beta)
- **AI Integration**: Vercel AI SDK v5 (beta)

### AI & Model Providers
- **Primary Model**: openai 'gpt-4.1-mini' (default)
- **Supported Providers**: 
  - xAI
  - OpenAI (default)
  - Anthropic
  - DeepSeek
- **Model Types**:
  - `chat-model`: Primary model for all-purpose chat
  - `chat-model-reasoning`: Advanced reasoning model

### Data Storage
- **Database**: Neon Serverless Postgres
- **File Storage**: Vercel Blob
- **Caching**: Redis (optional)
- **Session Management**: NextAuth.js with database sessions

## Project Structure

### Key Directories
```
app/
├── (auth)/          # Authentication routes and logic
├── (chat)/          # Main chat interface and API
└── layout.tsx       # Root layout with metadata

components/          # React components
├── ui/              # shadcn/ui base components
├── chat.tsx         # Main chat component
├── artifact*.tsx    # Artifact system components
└── message*.tsx     # Message handling components

lib/
├── ai/              # AI integration and configuration
│   ├── providers/   # Model provider configurations
│   ├── tools/       # AI tools and functions
│   ├── models.ts    # Model definitions
│   └── prompts.ts   # System prompts
├── db/              # Database schema and queries
└── editor/          # Text editor functionality

artifacts/           # Artifact system (code, text, sheets, images)
```

### Database Schema
- **Users**: Authentication and user management
- **Chats**: Conversation sessions with visibility controls
- **Messages**: Chat messages with parts and attachments (v2 schema)
- **Documents**: Artifact storage (text, code, image, sheet)
- **Suggestions**: Document improvement suggestions
- **Votes**: Message voting system
- **Streams**: Real-time streaming support

## Key Features

### Artifact System
Advanced content creation and editing system supporting:
- **Text Documents**: Rich text editing with ProseMirror
- **Code**: Python code execution with CodeMirror
- **Spreadsheets**: CSV-based data manipulation
- **Images**: SVG generation and editing

### Authentication
- **Guest Mode**: Available in development
- **Credential Auth**: Email/password with bcrypt
- **Session Management**: Database-backed sessions

### Chat Features
- **Real-time Streaming**: AI responses with streaming
- **Message History**: Persistent conversation storage
- **Visibility Controls**: Public/private chat sessions
- **Reasoning Mode**: Advanced AI reasoning display
- **Auto-resume**: Continuation of interrupted streams

### AI Tools (Current)
- `get-weather`: Weather data retrieval
- `create-document`: Artifact creation
- `update-document`: Artifact modification
- `request-suggestions`: Document improvement suggestions

## Development Conventions

### Code Style
- **Linting**: ESLint + Biome
- **Formatting**: Biome formatter
- **Type Safety**: Strict TypeScript configuration
- **Component Pattern**: Server/Client component separation

### Database
- **ORM**: Drizzle with PostgreSQL
- **Migrations**: Automated with build process
- **Schema Versioning**: V2 message schema (current)

### Environment Variables
```
AUTH_SECRET=****              # NextAuth secret
XAI_API_KEY=****              # xAI API key (primary)
BLOB_READ_WRITE_TOKEN=****    # Vercel Blob storage
POSTGRES_URL=****             # Database connection
REDIS_URL=****                # Redis cache (optional)
```

### Scripts
- `pnpm dev`: Development server with Turbo
- `pnpm build`: Production build with migrations
- `pnpm db:*`: Database management commands
- `pnpm test`: Playwright E2E tests

## Treasury-Specific Context

### Current State
- **Base Template**: Built on Vercel AI Chatbot template
- **Customization Level**: Minimal treasury-specific implementation
- **Branding**: Updated metadata and descriptions for treasury use case
- **Functionality**: Generic chatbot with artifact system

### Intended Functionality (Based on Metadata)
- Payment scheduling automation
- Treasury rule review and management
- Payout simulation and modeling
- Natural language financial operations

### Implementation Status
- ✅ Core chatbot infrastructure
- ✅ Artifact system for document creation
- ✅ Multi-model AI support
- ❌ Treasury-specific tools and integrations
- ❌ Payment system integration
- ❌ Financial rule engine
- ❌ Payout simulation tools

## Future Development Areas

### Treasury-Specific Tools Needed
1. **Payment Scheduling Tool**
   - Integration with payment processors
   - Recurring payment management
   - Payment validation and approval workflows

2. **Rule Management Tool**
   - Treasury policy definition
   - Compliance checking
   - Rule validation and testing

3. **Payout Simulation Tool**
   - Financial modeling
   - Scenario analysis
   - Risk assessment

4. **Financial Data Integration**
   - Bank API connections
   - Transaction history access
   - Real-time balance monitoring

### Technical Enhancements
- Custom AI tools for financial operations
- Integration with Venly's treasury APIs
- Enhanced security for financial data
- Audit logging for compliance
- Multi-tenant support for organizations

## Dependencies & Versions

### Key Dependencies
- `next`: 15.3.0-canary.31
- `ai`: 5.0.0-beta.21
- `react`: 19.0.0-rc
- `next-auth`: 5.0.0-beta.25
- `drizzle-orm`: ^0.34.0
- `@ai-sdk/*`: 2.0.0-beta series

### Development Tools
- `@biomejs/biome`: 1.9.4
- `@playwright/test`: ^1.50.1
- `typescript`: ^5.6.3
- `drizzle-kit`: ^0.25.0

## Notes

- Project uses beta versions of key dependencies (AI SDK, NextAuth)
- Built for Vercel deployment with integrated services
- Supports both development and production environments
- Includes comprehensive E2E testing with Playwright
- Ready for treasury-specific customization and tool development

---

*Last Updated: [Current Date]*
*This file serves as the persistent memory for Claude across sessions, containing project context, conventions, and development guidelines.*