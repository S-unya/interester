# interester

A personalized content monitoring system that allows users to register interests (topics, terms, URLs) and receive AI-curated, formatted summaries from across the web.

## Project Overview

**Purpose**: A personalized content monitoring system that allows users to register interests (topics, terms, URLs) and receive AI-curated, formatted summaries from across the web.

**Core Value Proposition**:

- **Intelligent Search**: Goes beyond simple keyword matching to find relevant content across the web.
- **AI Curation**: Uses LLMs (Google Gemini via Vercel AI SDK) to summarize and format content into digestible insights.
- **Flexible Monitoring**: Track specific terms, broad topics, or specific URLs.
- **Privacy-Focused**: Local-first architecture keeps your data on your machine.

---

## Current Status: MVP (Phase 1+)

The project has moved beyond the initial MVP, now featuring robust background monitoring and result management.

### Features Implemented

- **Interest Management**: Create, update, and delete interests with search terms and specific URLs to monitor.
- **Dashboard**: Visual overview of active interests and system status.
- **Automated Monitoring**: In-app scheduler triggers scans on hourly, daily, or weekly intervals (active while app is open).
- **System Notifications**: Native desktop notifications when new results are found according to your interests.
- **Result Management**: Detailed AI summaries with key points and sources, featuring read/unread status, archiving, and deletion.
- **Result Notes**: Attach personal thoughts or findings to specific AI-curated results.
- **Manual Trigger**: Ability to manually run any interest search at any time.
- **Local Storage**: All data (interests, results, notes) is stored locally in JSON files (`data/` directory).
- **AI Integration**: Integration with Vercel AI SDK using Google Gemini for intelligent content processing.
- **Desktop App**: Native desktop application performance and integration via Tauri v2.

### Technology Stack

- **Frontend**: SvelteKit (Svelte 5) + Vanilla CSS
- **Backend Logic**: Node.js (running within the Tauri context)
- **Desktop Framework**: Tauri v2
- **AI/LLM**: Vercel AI SDK (`ai`, `@ai-sdk/google`) using Google Gemini
- **Search**: Serper API
- **Storage**: Local JSON files via Tauri file system APIs

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- Rust (for Tauri)
- Google Gemini API Key
- Serper API Key

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
    GEMINI_KEY=your_gemini_api_key_here
    SERPER_KEY=your_serper_api_key_here
    ```

4. **Run the development server**

    ```bash
    npm run tauri dev
    ```

---

## UX Overhaul Plan

To transition from a "functional MVP" to a "power-user tool," the following UX improvements are planned:

- **Dashboard Intelligence**:
    - Add an "Activity Stream" showing recent hits across all interests.
    - Integration of "System Health" (last scan time, API status).
    - Quick-add input for new interests directly from the home screen.
- **Visual Feedback & Polish**:
    - Implementation of Skeleton Loaders for data-heavy views.
    - Pulsing status indicators for active background tasks.
    - Enhanced card states (hover interactions, transition animations).
- **Result Interactivity**:
    - "Pinning" important results to the top of an interest feed.
    - Inline quick actions (Mark as read, Archive) without entering the detail view.
    - Source rich previews (favicons and site meta-data).
- **Onboarding Experience**:
    - Pre-populated "Example Interests" for first-time users.
    - Guided empty states with helpful tips for getting started.
- **Ignore Rules (Noise Control)**:
    - Dedicated UI for defining global and per-interest ignore patterns (domains, keywords).
- **Dark Mode Support**:
    - Native dark theme to match OS preferences.

---

## Roadmap

### Phase 1: MVP Polish (Completed)

- [x] Basic CRUD for Interests
- [x] Local JSON Storage
- [x] Tauri App Shell
- [x] Manual "Run Search" trigger
- [x] Scheduling & Notifications
- [x] Result Management & Notes

### Phase 2: UX & System Polish (Upcoming)

- [ ] Implement **UX Overhaul Plan** (see section above)
- [ ] **True Background Support**: Migrate scheduling to Rust/Tauri to enable scans even when the app is closed.
- [ ] Refine AI summarization prompts for better consistency
- [ ] Improve search result parsing for broader site compatibility
- [ ] Build **Ignore Rules UI** for noise reduction

### Phase 3: Web & Cloud (Future)

- **Web Version**: Extract backend to run as a standalone web server.
- **Authentication**: User accounts for the web version.
- **Database**: Migrate from JSON to a proper database (SQLite/Postgres).
- **Multi-channel Delivery**: Email, SMS, and Webhook notifications.