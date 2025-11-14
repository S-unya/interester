# interester
A personalized content monitoring system that allows users to register interests (topics, terms, URLs) and receive AI-curated, formatted summaries from across the web.

## Project Overview

**Purpose**: A personalized content monitoring system that allows users to register interests (topics, terms, URLs) and receive AI-curated, formatted summaries from across the web.

**Core Value Proposition**: 
- More intelligent than RSS feeds - searches across the entire web
- AI-powered content curation and summarization
- Flexible delivery and scheduling options

---

## Technology Stack

### Phase 1 (MVP)
- **Frontend**: Astro (static site generation)
- **Backend**: Node.js
- **Data Storage**: JSON files
- **AI/LLM**: Vercel AI SDK (ai-sdk.dev) with Anthropic Claude
- **Hosting**: Local development
- **Search**: Web scraping + LLM-powered content extraction

### Future Phases
- **Database**: SQLite → PostgreSQL
- **Task Queue**: Bull/BullMQ for scheduled jobs
- **Email Service**: Resend, SendGrid, or AWS SES
- **Hosting**: Cloudflare Workers or AWS Lambda
- **Authentication**: (future) Auth.js / Clerk

---

## Project Phases

## Phase 1: Core Functionality (MVP)
**Goal**: Manual, single-user system with basic search and formatting

### Stage 1.1: Project Setup & Architecture
**Duration**: 1-2 days

**Tasks**:
- [ ] Initialize project structure
  - Create Astro frontend project
  - Set up Node.js backend structure
  - Configure TypeScript
- [ ] Set up development environment
  - Install dependencies (Vercel AI SDK, Anthropic SDK)
  - Configure environment variables
  - Set up Git repository with .gitignore
- [ ] Define data structures
  - Interest/Topic schema (JSON)
  - Search results schema
  - User preferences schema
- [ ] Create basic file-based storage system
  - JSON read/write utilities
  - Data validation

**Deliverables**:
- Working dev environment
- `/data/interests.json` structure
- `/data/results/` directory for search outputs
- Basic data access layer

---

### Stage 1.2: Interest Management UI
**Duration**: 2-3 days

**Tasks**:
- [ ] Create Astro pages
  - Dashboard/home page
  - Interest management page
  - Results viewing page
- [ ] Build interest registration form
  - Topic/subject name
  - Related search terms (array input)
  - Specific URLs to monitor (optional)
  - Content type hints (news, events, articles, etc.)
- [ ] Display existing interests
  - List view with edit/delete actions
  - Visual status indicators
- [ ] Create API routes for CRUD operations
  - POST /api/interests (create)
  - GET /api/interests (list)
  - PUT /api/interests/:id (update)
  - DELETE /api/interests/:id (delete)

**Deliverables**:
- Functional UI for managing interests
- RESTful API endpoints
- Persistent storage in JSON

---

### Stage 1.3: Search & Content Retrieval Engine
**Duration**: 3-4 days

**Tasks**:
- [ ] Implement web search functionality
  - Research options: SerpAPI, Tavily, or direct scraping
  - Create search query builder from interest data
  - Handle multiple search terms per interest
- [ ] Build content fetcher
  - HTTP client for fetching page content
  - Handle various content types (HTML, JSON APIs)
  - URL monitoring for specified sources
- [ ] Implement content extraction
  - Clean HTML/extract relevant text
  - Handle common web structures
  - Extract metadata (dates, authors, titles)
- [ ] Error handling & retries
  - Rate limiting
  - Timeout handling
  - Failed fetch logging

**Deliverables**:
- Search service module
- Content retrieval working for multiple sources
- Raw content storage in JSON

---

### Stage 1.4: AI Processing & Formatting
**Duration**: 3-4 days

**Tasks**:
- [ ] Set up Vercel AI SDK integration
  - Configure Anthropic provider
  - Create prompt templates
- [ ] Build content analysis system
  - Classify content types (events, news, articles, discussions)
  - Extract key information (dates, locations, key points)
  - Identify relevance to search terms
- [ ] Implement smart summarization
  - Different strategies for different content types
  - Event-based: chronological ordering with dates
  - News: importance ranking with summaries
  - Articles: key takeaways and links
- [ ] Create formatting engine
  - Generate structured reports
  - Apply consistent styling
  - Include source attribution
- [ ] Output generation
  - HTML format for web display
  - Save formatted results to JSON

**Deliverables**:
- AI-powered content processor
- Context-aware formatting (events sorted by date, etc.)
- Formatted output suitable for web display

---

### Stage 1.5: Manual Search Trigger & Results Display
**Duration**: 2-3 days

**Tasks**:
- [ ] Build search trigger UI
  - Dashboard with all interests listed
  - "Search Now" button for each interest
  - "Search All" bulk action
  - Loading states and progress indicators
- [ ] Create search orchestration
  - Queue multiple searches
  - Execute searches sequentially or in parallel
  - Track progress and status
- [ ] Implement results viewer
  - Display formatted results per interest
  - Show search timestamp
  - Filter/sort options (by date, relevance)
  - Export options (copy, download)
- [ ] Add result history
  - Store previous search results
  - Compare with previous runs
  - Show new/updated content

**Deliverables**:
- Working manual search system
- Results display page
- Search history tracking

---

### Stage 1.6: Testing & Polish
**Duration**: 2-3 days

**Tasks**:
- [ ] End-to-end testing
  - Test various interest types
  - Verify AI output quality
  - Check error handling
- [ ] UI/UX improvements
  - Responsive design
  - Loading states
  - Error messages
  - Empty states
- [ ] Performance optimization
  - Caching strategies
  - Concurrent request handling
  - LLM token usage optimization
- [ ] Documentation
  - README with setup instructions
  - API documentation
  - Data structure documentation

**Deliverables**:
- Tested, working MVP
- Documentation
- Ready for user feedback

---

## Phase 1.5: Desktop Application (Tauri)
**Goal**: Package the application as a native desktop app for easy installation and better UX

### Stage 1.5.1: Tauri Setup & Integration
**Duration**: 2-3 days

**Tasks**:
- [ ] Install and configure Tauri
  - Add Tauri CLI and dependencies
  - Initialize Tauri in existing project
  - Configure `tauri.conf.json`
- [ ] Adapt Astro build for Tauri
  - Configure build output for Tauri
  - Update asset paths for local file system
  - Test Astro SSR/SSG compatibility with Tauri
- [ ] Set up local backend server
  - Embed Node.js server or migrate to Rust backend
  - Configure local API endpoints
  - Handle port conflicts and auto-port selection
- [ ] Configure app metadata
  - App name, version, and description
  - App icons for different platforms
  - Window configuration (size, resizable, etc.)

**Deliverables**:
- Tauri development environment working
- Astro frontend loading in Tauri window
- Local API server running alongside Tauri

---

### Stage 1.5.2: Native Features & System Integration
**Duration**: 2-3 days

**Tasks**:
- [ ] Implement system tray integration
  - Background app support
  - Quick access to search triggers
  - Status indicators
- [ ] Add native notifications
  - Desktop notifications for search completion
  - Click-to-open result actions
- [ ] File system integration
  - Use native file system for JSON storage
  - App data directory handling
  - Settings persistence
- [ ] Menu bar and keyboard shortcuts
  - Native menu creation
  - Global keyboard shortcuts
  - Context menus
- [ ] Auto-updater setup
  - Configure Tauri updater
  - Version management
  - Update notifications

**Deliverables**:
- Native desktop app experience
- System tray functionality
- Desktop notifications
- Auto-update capability

---

### Stage 1.5.3: Build & Distribution
**Duration**: 2-3 days

**Tasks**:
- [ ] Configure build targets
  - macOS (DMG/app bundle)
  - Windows (MSI/EXE)
  - Linux (AppImage/deb)
- [ ] Code signing setup
  - macOS: Apple Developer certificates
  - Windows: Code signing certificate
- [ ] Create installers
  - Platform-specific installer configurations
  - Custom install screens
  - File associations (optional)
- [ ] Test installation flows
  - Fresh install testing on all platforms
  - Update scenarios
  - Uninstall cleanup
- [ ] Distribution preparation
  - GitHub Releases setup
  - Download landing page
  - Installation instructions

**Deliverables**:
- Installable desktop applications for macOS, Windows, Linux
- Signed and notarized builds (macOS)
- Distribution mechanism via GitHub Releases
- User installation guide

---

### Stage 1.5.4: Desktop-Specific Polish
**Duration**: 1-2 days

**Tasks**:
- [ ] Optimize for desktop use
  - Window state persistence (size, position)
  - Multi-window support (optional)
  - Drag-and-drop URL imports
- [ ] Offline capability
  - Graceful handling of no internet
  - Queue searches for when online
  - Cached results viewing
- [ ] Performance optimization
  - Reduce bundle size
  - Lazy loading
  - Memory management
- [ ] Platform-specific UI adjustments
  - Native look and feel
  - OS-specific UI patterns
  - Accessibility features

**Deliverables**:
- Polished desktop application
- Platform-native user experience
- Optimized performance

---

## Phase 2: Scheduling & Automation
**Goal**: Automated periodic searches without user intervention

### Stage 2.1: Scheduling Infrastructure
**Duration**: 2-3 days

**Tasks**:
- [ ] Add scheduling configuration to interests
  - Frequency options (hourly, daily, weekly)
  - Time preferences
  - Active/inactive toggle
- [ ] Implement task scheduler
  - Use node-cron or Bull for job scheduling
  - Job queue management
  - Persistence of scheduled jobs
- [ ] Build background worker
  - Separate process for executing searches
  - Job execution logging
  - Failure handling and retries
- [ ] Create monitoring dashboard
  - View scheduled jobs
  - Job execution history
  - Success/failure rates

**Deliverables**:
- Automated search execution
- Configurable schedules per interest
- Background job processor

---

### Stage 2.2: Notification System (Email)
**Duration**: 3-4 days

**Tasks**:
- [ ] Add user notification preferences
  - Email address storage
  - Notification frequency (immediate, digest, custom)
  - Content preferences
- [ ] Choose and integrate email service
  - Set up Resend/SendGrid/AWS SES
  - Configure API keys
  - Design email templates
- [ ] Build email composer
  - Convert formatted results to email HTML
  - Support plain text fallback
  - Add unsubscribe/settings links
- [ ] Implement notification triggers
  - Send on successful search completion
  - Batch multiple results into digests
  - Handle email failures gracefully
- [ ] Email template design
  - Responsive email HTML
  - Different templates for different content types
  - Branding and styling

**Deliverables**:
- Working email notifications
- Professional email templates
- Configurable notification preferences

---

### Stage 2.3: Data Migration to Database
**Duration**: 2-3 days

**Tasks**:
- [ ] Choose database (SQLite for simplicity)
  - Design schema (interests, searches, results, settings)
  - Set up migrations system
- [ ] Implement data access layer
  - ORM setup (Prisma or Drizzle)
  - CRUD operations for all entities
  - Query optimization
- [ ] Migration script
  - Convert JSON files to database
  - Data validation
  - Rollback capability
- [ ] Update all API endpoints
  - Switch from JSON to database queries
  - Maintain backward compatibility during transition

**Deliverables**:
- SQLite database operational
- All data migrated from JSON
- Improved query performance

---

## Phase 3: Enhanced Features & Scale
**Goal**: Production-ready system with advanced features

### Stage 3.1: Advanced Content Discovery
**Duration**: 3-4 days

**Tasks**:
- [ ] Implement smart content discovery
  - ML-based relevance scoring
  - Semantic similarity matching
  - Duplicate detection
- [ ] Add source diversity
  - Reddit integration
  - Social media monitoring (Twitter/X API)
  - YouTube search
  - GitHub trending
- [ ] Content freshness detection
  - Avoid re-sending old content
  - Highlight truly new information
  - Track content updates

**Deliverables**:
- Multiple content sources integrated
- Improved content quality and relevance
- Deduplication system

---

### Stage 3.2: User Customization & Preferences
**Duration**: 2-3 days

**Tasks**:
- [ ] Advanced filtering options
  - Exclude certain sources
  - Content length preferences (brief vs detailed)
  - Language preferences
- [ ] Format customization
  - Choose output style (digest, detailed, bullet points)
  - Content type priorities
- [ ] Smart defaults
  - Learn from user interactions
  - Suggest new search terms
  - Auto-adjust frequencies

**Deliverables**:
- Customizable user experience
- Intelligent recommendations
- Improved relevance

---

### Stage 3.3: Additional Notification Channels
**Duration**: 3-4 days

**Tasks**:
- [ ] Slack integration
  - Webhook setup
  - Message formatting for Slack
  - Channel/DM options
- [ ] Discord integration
  - Bot setup
  - Formatted embeds
- [ ] Push notifications (optional)
  - Web push API
  - Mobile notifications prep
- [ ] RSS feed generation
  - Create RSS feeds per interest
  - Allow external feed readers

**Deliverables**:
- Multiple delivery channels
- User choice of notification method
- Feed-based access

---

### Stage 3.4: Cloud Deployment
**Duration**: 3-5 days

**Tasks**:
- [ ] Prepare for cloud deployment
  - Environment configuration
  - Secrets management
  - Database migration to cloud (PostgreSQL)
- [ ] Choose and set up hosting
  - Cloudflare Workers / Pages for frontend
  - AWS Lambda or Cloudflare Workers for backend
  - Database hosting (Neon, Supabase, AWS RDS)
- [ ] Set up CI/CD
  - GitHub Actions or similar
  - Automated testing
  - Deployment pipelines
- [ ] Monitoring and logging
  - Error tracking (Sentry)
  - Performance monitoring
  - Usage analytics
- [ ] Cost optimization
  - Cache strategies
  - Rate limiting
  - Batch processing

**Deliverables**:
- Production deployment
- Automated deployment pipeline
- Monitoring and alerting

---

## Phase 4: Multi-User & Advanced Features (Future)
**Goal**: Scale to multiple users with authentication

### Features to Consider:
- User authentication and accounts
- Shared interests / collaborative monitoring
- API access for external integrations
- Mobile app
- Chrome extension for quick interest addition
- AI chat interface for querying results
- Trend analysis and insights
- Export to note-taking apps (Notion, Obsidian)

---

## Success Metrics

### Phase 1 (MVP)
- Successfully register and store interests
- Execute manual searches and retrieve relevant content
- Generate formatted, readable summaries
- Display results in web UI

### Phase 2 (Automation)
- Scheduled searches run reliably
- Email notifications delivered successfully
- Users receive timely, relevant content

### Phase 3 (Production)
- System handles 100+ interests reliably
- Response time < 30 seconds for search execution
- Email delivery rate > 95%
- User retention and engagement

---

## Risk Mitigation

### Technical Risks
1. **Web scraping reliability**: Sites may block or change structure
   - *Mitigation*: Use multiple sources, implement robust error handling, consider paid APIs
   
2. **LLM costs**: API usage could be expensive
   - *Mitigation*: Implement caching, batch processing, token usage monitoring
   
3. **Content quality**: AI might miss relevant content or include irrelevant results
   - *Mitigation*: Iterative prompt engineering, user feedback loops, manual override options

### Operational Risks
1. **Rate limiting**: Search APIs and scraped sites may impose limits
   - *Mitigation*: Implement respectful rate limiting, distribute requests, use proxies if needed
   
2. **Email deliverability**: Emails may be marked as spam
   - *Mitigation*: Use reputable email service, proper SPF/DKIM, opt-in only, unsubscribe links

---

## Next Steps

1. **Immediate**: Set up project structure and development environment (Stage 1.1)
2. **This Week**: Build interest management UI (Stage 1.2)
3. **Week 2-3**: Implement search and AI processing (Stages 1.3-1.4)
4. **Week 4**: Complete MVP with manual triggers (Stage 1.5-1.6)

---

## Notes & Considerations

- **Privacy**: Even without user accounts, consider data privacy for stored interests and search history
- **Legal**: Respect robots.txt and terms of service for scraped sites
- **Scalability**: JSON storage will work for 1 user with ~50 interests, but plan migration path
- **Content Types**: Start with articles/news, add events handling early due to date sorting requirement
- **Feedback Loop**: Build in ways to capture which results are useful for improving AI prompts

---

**Last Updated**: November 14, 2025
**Project Status**: Planning Phase
**Next Milestone**: Stage 1.1 - Project Setup

