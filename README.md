# interester

A personalized content monitoring system that allows users to register interests (topics, terms, URLs) and receive AI-curated, formatted summaries from across the web.

## Project Overview

**Purpose**: A personalized content monitoring system that allows users to register interests (topics, terms, URLs) and receive AI-curated, formatted summaries from across the web.

**Core Value Proposition**:

- **Intelligent Search**: Goes beyond simple keyword matching to find relevant content across the web.
- **AI Curation**: Uses LLMs (Anthropic Claude) to summarize and format content into digestible insights.
- **Flexible Monitoring**: Track specific terms, broad topics, or specific URLs.
- **Privacy-Focused**: Local-first architecture keeps your data on your machine.

---

## Current Status: MVP (Phase 1)

The project is currently in the **MVP (Minimum Viable Product)** phase, operating as a local desktop application.

### Features Implemented

- **Interest Management**: Create, update, and delete interests with search terms and specific URLs to monitor.
- **Dashboard**: Visual overview of active interests and system status.
- **Local Storage**: All data is stored locally in JSON files (`data/` directory).
- **AI Integration**: Basic integration with Vercel AI SDK and Anthropic for content processing.
- **Desktop App**: Wrapped as a native desktop application using Tauri.

### Technology Stack

- **Frontend**: SvelteKit (Svelte 5) + Tailwind CSS / Vanilla CSS
- **Backend Logic**: Node.js (running within the Tauri context)
- **Desktop Framework**: Tauri v2
- **AI/LLM**: Vercel AI SDK (`ai`, `@ai-sdk/anthropic`)
- **Storage**: Local JSON files via Tauri file system APIs

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- Rust (for Tauri)
- Anthropic API Key

### Installation

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd interester/interester
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Set up environment variables**
    Create a `.env` file in the `interester` directory:

    ```env
    ANTHROPIC_API_KEY=your_api_key_here
    ```

4. **Run the development server**

    ```bash
    npm run tauri dev
    ```

---

## Roadmap

### Phase 1: MVP Polish (Current)

- [x] Basic CRUD for Interests
- [x] Local JSON Storage
- [x] Tauri App Shell
- [ ] Refine AI summarization prompts
- [ ] Improve search result parsing
- [ ] Add manual "Run Search" trigger

### Phase 2: Enhanced Capabilities

- **Scheduling**: Automated background searches (hourly, daily).
- **Notifications**: System notifications for new summaries.
- **Better UI**: Enhanced result visualization and history.

### Phase 3: Web & Cloud (Future)

- **Web Version**: Extract backend to run as a standalone web server.
- **Authentication**: User accounts for the web version.
- **Database**: Migrate from JSON to a proper database (SQLite/Postgres).
- **Multi-channel Delivery**: Email, SMS, and Webhook notifications.