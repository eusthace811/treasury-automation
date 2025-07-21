# Claude.md - Treasury Automation Project Memory

## Project Overview

**Treasury Automation** is an AI-powered chatbot application designed to help users manage treasury operations through natural language interactions. Built on the Vercel AI Chatbot template, it enables users to schedule payments, review rules, and execute treasury operations using conversational AI.

### Core Purpose
- **Primary Function**: Treasury management automation through conversational AI
- **User Experience**: Natural language interface for complex financial operations  
- **Target Use Cases**: Payment scheduling, rule management, execution monitoring

### Key Innovation
**Chat-as-Rule-Storage Architecture**: Revolutionary approach where treasury rules are stored directly in chat records, eliminating the need for separate rule storage tables and creating a unified conversation-rule management system.

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
- **Default Provider**: OpenAI (configurable via API_KEY_PROVIDER)
- **Supported Providers**: 
  - OpenAI
  - xAI  
  - Anthropic
  - DeepSeek
- **Model Types**:
  - `chat-model`: Primary model for all-purpose chat
  - `chat-model-reasoning`: Advanced reasoning model

### Data Storage & Integration
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Vercel Blob
- **Caching**: Redis (optional)
- **Session Management**: NextAuth.js with database sessions
- **Queue System**: QStash for rule scheduling and execution

## Project Structure

### Key Directories
```
app/
├── (auth)/          # Authentication routes and logic
├── (chat)/          # Main chat interface and API
│   ├── api/qstash/  # QStash webhook endpoints
│   └── queue/       # Queue management interface
└── layout.tsx       # Root layout with metadata

components/
├── ui/              # shadcn/ui base components
├── queue/           # Queue management components
├── chat.tsx         # Main chat component
├── artifact*.tsx    # Artifact system components
└── message*.tsx     # Message handling components

lib/
├── ai/              # AI integration and configuration
│   ├── providers/   # Model provider configurations
│   ├── tools/       # AI tools and treasury-specific functions
│   ├── models.ts    # Model definitions
│   └── prompts.ts   # System prompts
├── db/              # Database schema and queries
├── treasury/        # Treasury-specific schema and types
├── qstash/          # QStash integration
└── editor/          # Text editor functionality

data/mockup/         # Treasury mockup data for realistic testing
artifacts/           # Artifact system (code, text, sheets, images)
```

### Treasury-Enhanced Database Schema
- **Users**: Authentication and user management
- **Chats**: Enhanced with treasury rule fields:
  - `original`: Natural language rule text
  - `ruleData`: Parsed treasury rule structure (JSONB)
  - `isActive`: Rule execution status
  - `memo`: Optional rule notes
  - `scheduleId`: QStash schedule/message ID
  - `updatedAt`: Rule modification tracking
  - `deletedAt`: Soft delete support
- **Messages**: Chat messages with parts and attachments (v2 schema)
- **Documents**: Artifact storage (text, code, image, sheet)
- **Suggestions**: Document improvement suggestions
- **Votes**: Message voting system

## Treasury-Specific Features

### AI-Powered Rule Management System
Complete end-to-end treasury rule processing:

#### **Core AI Tools** (`lib/ai/tools/`)
- **`rule-parser.ts`**: Converts natural language to structured JSON treasury rules
- **`rule-evaluator.ts`**: Analyzes rule conflicts (schedule, payment, condition, beneficiary)
- **`rule-validator.ts`**: Validates rules against schema and business logic
- **`rule-saver.ts`**: CRUD operations for treasury rules with user isolation
- **`rule-updater.ts`**: Updates chat records with rule changes and QStash integration
- **`rule-answer.ts`**: Provides structured responses for rule operations

#### **Treasury Schema & Types** (`lib/treasury/`)
Comprehensive rule definitions supporting:
- **Execution Types**: `once`, `schedule`, `hook`
- **Payment Actions**: `simple`, `split`, `calculation`, `leftover`
- **Conditional Logic**: Before/after execution conditions
- **Amount Handling**: Static amounts and dynamic calculations
- **Strong TypeScript typing** throughout

### Queue Management & Scheduling System

#### **QStash Integration** (`lib/qstash/`)
- **Real-time scheduling** for treasury rule execution
- **Dual execution modes**: Recurring schedules and one-time delayed messages
- **Webhook handling** for rule execution callbacks

#### **Queue UI Components** (`components/queue/`)
- **Schedule Tab**: Active QStash schedules with cron interpretation
- **Queue Tab**: Execution logs with status tracking and error handling
- **Real-time refresh** and advanced filtering capabilities

#### **Queue Management Interface** (`/queue`)
- **Tabbed interface** for schedules and logs
- **Real-time data fetching** with comprehensive error handling
- **Professional UI** with loading states and pagination

### Treasury Context & Mockup Data (`data/mockup/`)
Realistic financial data for testing and development:
- **Treasury**: Company financial snapshots with burn rate calculations
- **Accounts**: Crypto accounts with balances (Operating, Reserve, Sales, etc.)
- **Beneficiaries**: Employee/contractor data with wallet addresses
- **Invoices**: Contractor invoices with approval workflows
- **Transactions**: Transaction interface (structured for future use)

### Rule Processing Workflow
1. **Natural language input** → AI parsing (`rule-parser`)
2. **Schema validation** (`rule-validator`)
3. **Conflict detection** (`rule-evaluator`) 
4. **Database storage** (`rule-saver`/`rule-updater`)
5. **QStash scheduling** for execution
6. **Queue monitoring** via management interface

## Key Features

### Enhanced Chat System
- **Treasury rule storage** directly in chat records
- **Rule lifecycle management** (create, update, activate, deactivate)
- **Conflict resolution** with AI-powered suggestions
- **Execution monitoring** through queue interface

### Artifact System
Advanced content creation and editing system supporting:
- **Text Documents**: Rich text editing with ProseMirror
- **Code**: Python code execution with CodeMirror
- **Spreadsheets**: CSV-based data manipulation
- **Images**: SVG generation and editing

### Authentication & Security
- **Guest Mode**: Available in development
- **Credential Auth**: Email/password with bcrypt
- **Session Management**: Database-backed sessions
- **User Isolation**: Treasury rules scoped to individual users

### AI Tools (Current)
**Treasury-Specific**:
- `rule-parser`: Natural language to treasury rule conversion
- `rule-evaluator`: Rule conflict analysis
- `rule-validator`: Rule validation and business logic checking
- `rule-saver`: Rule CRUD operations
- `rule-updater`: Rule updates with QStash integration
- `rule-answer`: Structured rule operation responses

**General**:
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
- **Treasury Extensions**: Chat table enhanced with rule fields

### Environment Variables
```
AUTH_SECRET=****                    # NextAuth secret
API_KEY_PROVIDER=****               # AI provider selection (openai default)
OPENAI_API_KEY=****                 # OpenAI API key
XAI_API_KEY=****                    # xAI API key  
ANTHROPIC_API_KEY=****              # Anthropic API key
DEEPSEEK_API_KEY=****               # DeepSeek API key
BLOB_READ_WRITE_TOKEN=****          # Vercel Blob storage
POSTGRES_URL=****                   # Database connection
REDIS_URL=****                      # Redis cache (optional)
QSTASH_URL=****                     # QStash endpoint
QSTASH_TOKEN=****                   # QStash authentication
QSTASH_CURRENT_SIGNING_KEY=****     # QStash webhook verification
QSTASH_NEXT_SIGNING_KEY=****        # QStash webhook verification
```

### Scripts
- `pnpm dev`: Development server with Turbo
- `pnpm build`: Production build with migrations
- `pnpm lint`: ESLint + Biome linting
- `pnpm format`: Biome formatting
- `pnpm db:*`: Database management commands
- `pnpm test`: Playwright E2E tests

## Implementation Status

### ✅ Fully Implemented
- **Complete rule management system** from parsing to execution
- **QStash integration** for scheduling and webhooks
- **Rich mockup data** for realistic treasury context
- **Queue management interface** with real-time monitoring
- **Database schema** with treasury extensions
- **AI-powered rule processing** with conflict detection
- **TypeScript type safety** throughout treasury components
- **Professional UI components** for queue management

### ✅ Core Infrastructure
- **Multi-model AI support** (OpenAI, xAI, Anthropic, DeepSeek)
- **Artifact system** for document creation
- **Authentication system** with user isolation
- **Real-time streaming** AI responses
- **Comprehensive testing** with Playwright

### ❌ Not Yet Implemented
- **Actual payment processor integration**
- **Real bank/wallet API connections** 
- **Production webhook endpoints** (currently uses ngrok for development)
- **Transaction history persistence**
- **Financial compliance features**
- **Multi-tenant organization support**
- **Audit logging** for compliance

## Future Development Areas

### Priority Enhancements
1. **Payment Processor Integration**
   - Real payment execution (currently simulation only)
   - Multi-chain cryptocurrency support
   - Traditional banking API integration

2. **Production Infrastructure**
   - Replace ngrok with production webhook endpoints
   - Implement comprehensive audit logging
   - Add financial compliance features

3. **Advanced Treasury Features**
   - Multi-tenant organization support
   - Advanced financial modeling and simulation
   - Enhanced security for production financial data
   - Integration with Venly's treasury APIs

### Technical Improvements
- **Error handling** enhancement throughout pipeline
- **Performance optimization** for large rule sets
- **Enhanced monitoring** and observability
- **Backup and recovery** systems

## Dependencies & Versions

### Key Dependencies
- `next`: 15.3.0-canary.31
- `ai`: 5.0.0-beta.21
- `react`: 19.0.0-rc-45804af1-20241021
- `next-auth`: 5.0.0-beta.25
- `drizzle-orm`: ^0.34.0
- `@ai-sdk/*`: 2.0.0-beta series
- `@upstash/qstash`: ^2.8.1
- `cron-validator`: ^1.4.0
- `date-fns`: ^4.1.0

### Development Tools
- `@biomejs/biome`: 1.9.4
- `@playwright/test`: ^1.50.1
- `typescript`: ^5.6.3
- `drizzle-kit`: ^0.25.0

## Technical Achievements

### Revolutionary Architecture
- **Chat-as-Rule-Storage**: Eliminates separate rule storage complexity
- **AI-Powered Rule Processing**: Natural language to structured data conversion
- **Comprehensive Validation**: Multiple layers of rule validation and conflict detection
- **Real-Time Scheduling**: Production-ready QStash integration

### Production-Ready Components
- **Professional queue management interface**
- **Robust error handling** throughout the pipeline
- **Type-safe** treasury operations
- **Comprehensive testing** infrastructure
- **Modern UI/UX** with professional styling

## Notes

- **Innovative approach** to treasury rule management through chat integration
- **Production-ready** scheduling and queue management system
- **Comprehensive AI tooling** for treasury operations
- **Rich development environment** with realistic mockup data
- **Professional UI components** ready for production deployment
- **Strong foundation** for Venly treasury API integration
- **Scalable architecture** supporting future multi-tenant requirements

---

*Last Updated: July 21, 2025*
*This file serves as the persistent memory for Claude across sessions, containing project context, conventions, and development guidelines.*