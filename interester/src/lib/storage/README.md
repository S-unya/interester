# Storage Abstraction Layer

This directory contains the storage abstraction layer for the Interester application. It provides a unified interface for reading and writing data that works across different environments (web/dev and Tauri desktop).

## Architecture

The storage system uses the **Adapter Pattern** to abstract the underlying storage mechanism:

```
┌─────────────────────────────────────┐
│   Application Code                  │
│   (InterestStorage, PreferencesStorage, etc.) │
└──────────────┬──────────────────────┘
               │
               │ uses
               ▼
┌──────────────────────────────────────┐
│   Storage Adapter Interface          │
│   (read, write, exists, delete, list)│
└──────────────┬───────────────────────┘
               │
               │ implements
               ▼
     ┌─────────┴─────────┐
     │                   │
┌────▼──────┐    ┌──────▼──────┐
│JSON Fetch │    │Tauri Store  │
│ Adapter   │    │  Adapter    │
└───────────┘    └─────────────┘
  (Web/Dev)        (Desktop)
```

## Components

### Core Files

- **`adapter.ts`** - Defines the `StorageAdapter` interface and configuration management
- **`init.ts`** - Handles automatic adapter selection based on environment
- **`index.ts`** - Main export file for the storage module

### Adapters

- **`adapters/json-fetch.ts`** - Web/development adapter using fetch API and file system
- **`adapters/tauri-store.ts`** - Desktop adapter using Tauri's plugin-store

### Storage Modules

- **`interests.ts`** - CRUD operations for user interests
- **`preferences.ts`** - User preferences management
- **`results.ts`** - Search results storage

## Usage

### Initialization

The storage system is automatically initialized in `+layout.ts`:

```typescript
import { initializeStorage } from '$lib/storage';

export async function load() {
  await initializeStorage();
  return {};
}
```

This detects whether the app is running in Tauri and configures the appropriate adapter.

### Using Storage

Import the storage modules you need:

```typescript
import { InterestStorage, PreferencesStorage, ResultStorage } from '$lib/storage';

// Get all interests
const interests = await InterestStorage.getAll();

// Create a new interest
const newInterest = await InterestStorage.create({
  name: 'Machine Learning',
  searchTerms: ['AI', 'ML', 'neural networks'],
  contentTypes: ['articles', 'news'],
  active: true
});

// Update preferences
await PreferencesStorage.update({
  maxResultsPerSearch: 20,
  enableNotifications: true
});

// Save search results
await ResultStorage.save(interestId, results);
```

## Adapters

### JsonFetchAdapter

Used in web/development environments:

- **Read**: Uses `fetch()` to read JSON files from `/data/` directory
- **Write**: POSTs to `/api/storage/write` endpoint
- **Delete**: POSTs to `/api/storage/delete` endpoint
- **List**: GETs from `/api/storage/list` endpoint
- **Caching**: Implements in-memory cache for read operations

### TauriStoreAdapter

Used in Tauri desktop environments:

- **Storage**: Uses `@tauri-apps/plugin-store` for persistent key-value storage
- **Initialization**: Lazy initialization on first use
- **Persistence**: Automatically saves after write/delete operations
- **Cross-platform**: Works on macOS, Windows, and Linux

## Environment Detection

The system automatically detects the runtime environment:

```typescript
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' 
    && '__TAURI__' in window 
    && window.__TAURI__ !== undefined;
}
```

## Data Format

All data is stored as JSON. Keys follow this convention:

- **Interests**: `interests.json`
- **Preferences**: `preferences.json`
- **Results**: `results/{interestId}.json`
- **Result notes**: `result-notes/{interestId}.json`

## Results data model and lifecycle

This section outlines the proposed Phase 2+ data structures for search results, ignore rules, notes, and lifecycle management. It is a design document – the TypeScript interfaces in `src/lib/types.ts` will be updated to match as features are implemented.

### Stored results (`results/{interestId}.json`)

Each `results/{interestId}.json` file continues to store an array of AI-formatted results. Conceptually, we extend the existing `FormattedResult` shape with lifecycle and ignore metadata:

```typescript
interface FormattedResultWithMeta /* extends FormattedResult */ {
  // Existing fields from FormattedResult
  id: string;
  interestId: string;
  searchId: string;
  formattedHtml: string;
  formattedText: string;
  summary: string;
  keyPoints: string[];
  sources: {
    title: string;
    url: string;
    date?: string;
  }[];
  generatedAt: string;

  // Result lifecycle
  status?: "unread" | "read" | "archived"; // default treated as "unread" at runtime
  readAt?: string; // ISO string
  archivedAt?: string; // ISO string

  // Ignore metadata
  ignored?: boolean; // explicit flag that this result should not normally be shown
  ignoredAt?: string;
  ignoredReason?: string; // free-text explanation
  ignoredByRuleId?: string; // link to an IgnoreRule (see below)
}
```

Runtime code should treat `status` and `ignored` as optional to remain backwards compatible with existing JSON files (missing fields imply `status = "unread"` and `ignored = false`).

### Ignore rules

Ignore rules express user or model-suggested instructions for content that should be hidden or deprioritised. These are primarily attached to an `Interest` so that the interest setup form can surface them.

Conceptual shape:

```typescript
interface IgnoreRule {
  id: string; // stable identifier, e.g. crypto.randomUUID()
  label: string; // short human-friendly name, e.g. "Ignore paywalled sites"
  reason?: string; // optional longer description shown in the UI

  // Simple pattern-based matching – all fields are optional
  pattern: {
    domains?: string[];      // e.g. ["example.com", "sub.domain.org"]
    urlSubstrings?: string[]; // raw substrings to match within the URL
    titleIncludes?: string[]; // case-insensitive contains checks on titles
    sourceIncludes?: string[]; // matches against the `source`/domain name
  };

  scope?: "interest" | "global" | "model-suggested";
  active: boolean;
  createdAt: string;
  createdBy?: "user" | "system" | "model";
}
```

Ignore rules live alongside an `Interest` so that they can be managed from the interest form:

```typescript
interface Interest /* existing fields omitted for brevity */ {
  // ...existing fields...

  // Per-interest ignore rules
  ignoreRules?: IgnoreRule[];

  // Optional per-interest retention policy (see below)
  resultRetentionDays?: number; // overrides any global default when set
}
```

Typical behaviour:

- When running a search for an interest, raw search results and/or formatted results are filtered against the active `ignoreRules`.
- If a rule is applied to a specific result, the result metadata is updated with `ignored = true`, `ignoredAt`, and `ignoredByRuleId`.
- The LLM can suggest new ignore rules by emitting text that is converted into an `IgnoreRule` with `scope = "model-suggested"` and `createdBy = "model"`, which the user may then accept or edit.

### Result notes (`result-notes/{interestId}.json`)

Notes are stored separately from results to keep the AI output immutable whilst still allowing user annotations.

Each `result-notes/{interestId}.json` file stores an array of notes for that interest:

```typescript
interface ResultNote {
  id: string;
  interestId: string; // denormalised for convenience
  resultId: string; // foreign key to FormattedResult.id

  body: string; // markdown/plain text note content
  pinned?: boolean; // for future "pin to top" behaviour

  createdAt: string;
  updatedAt?: string;
}
```

A new storage module (e.g. `src/lib/storage/result-notes.ts`) can wrap these operations:

- `getByInterestId(interestId): Promise<ResultNote[]>`
- `getByResultId(interestId, resultId): Promise<ResultNote[]>`
- `saveAll(interestId, notes: ResultNote[])`

The UI should load notes for an interest alongside `FormattedResult` objects and join them by `resultId` so that notes appear with their related result, without modifying the underlying `results/{interestId}.json` file.

### Retention and automatic deletion

Result management (mark as read, delete, delete after a period) relies on two pieces:

1. **Per-result lifecycle fields** on `FormattedResultWithMeta` (`status`, `readAt`, `archivedAt`).
2. **Retention configuration** in user preferences and/or interests.

A proposed extension to `UserPreferences`:

```typescript
interface UserPreferences {
  // existing fields...
  defaultResultRetentionDays?: number; // e.g. 30 – keep results for 30 days by default
}
```

Processing rules:

- Effective retention for an interest is `interest.resultRetentionDays ?? userPreferences.defaultResultRetentionDays`.
- On load (or in a periodic background job), results older than the retention window can be:
  - **Soft-deleted** by setting `status = "archived"` (kept for history) and hidden from default views, or
  - **Hard-deleted** by physically removing them from the JSON array.
- The choice between soft and hard deletion can be made per view; initially, a simple hard-delete implementation is acceptable for keeping file sizes bounded.

Deletion considerations (for future refinement):

- Results with one or more user notes may reasonably be expected to stick around longer than ephemeral results with no notes.
- Pinned notes could be treated as a strong signal not to auto-delete the associated result without explicit user action.
- Deletion policies may need to distinguish between manual deletion (where deleting a result and its notes together is often fine) and automated retention-based deletion.
- Some users may prefer to keep notes even if the underlying result is removed, which suggests a possible future "orphaned notes" view or a soft-delete strategy for results-with-notes.

For the initial implementation, deletion and retention logic can treat results with and without notes identically; these considerations are captured here so that the behaviour can be revisited once there is real user feedback.

### Result management operations

At the storage layer, these behaviours can be expressed as convenience methods around `ResultStorage`:

- `markAsRead(interestId, resultId)` – sets `status = "read"` and `readAt = now` for the matching result.
- `markAsUnread(interestId, resultId)` – clears `status`/`readAt` or sets `status = "unread"`.
- `archiveResult(interestId, resultId)` – sets `status = "archived"` and `archivedAt = now`.
- `deleteResult(interestId, resultId)` – removes the result from the array; optionally also deletes associated notes.
- `deleteOlderThan(interestId, cutoffDate)` – bulk remove or archive results older than a given ISO date, using the retention rules above.

These functions would be thin helpers that:

1. Load `results/{interestId}.json` via `ResultStorage.getByInterestId`.
2. Apply the relevant transformation.
3. Persist using `ResultStorage.save(interestId, updatedResults)`.

UI-level filtering (e.g. show only unread, hide ignored, filter by age) should rely on these stored fields rather than re-deriving state from scratch.

## API Endpoints (Web/Dev)

The JSON fetch adapter requires these API endpoints:

- `POST /api/storage/write` - Write data to file system
- `POST /api/storage/delete` - Delete data from file system
- `GET /api/storage/list` - List available files

These endpoints use Node.js `fs/promises` to interact with the file system in `static/data/`.

## Adding a New Storage Module

1. Create a new file in `src/lib/storage/`
2. Import the adapter:

```typescript
import { getStorageAdapter } from './adapter';
```

3. Define your storage operations:

```typescript
export const MyStorage = {
  async get(): Promise<MyData> {
    const adapter = getStorageAdapter();
    return await adapter.read<MyData>('my-data.json') || defaultValue;
  },
  
  async save(data: MyData): Promise<void> {
    const adapter = getStorageAdapter();
    await adapter.write('my-data.json', data);
  }
};
```

4. Export from `index.ts`

## Testing

To test with different adapters:

```typescript
import { configureStorage, JsonFetchAdapter, TauriStoreAdapter } from '$lib/storage';

// Use JSON adapter
configureStorage(new JsonFetchAdapter());

// Use Tauri adapter
configureStorage(new TauriStoreAdapter());
```

## Future Enhancements

- **Encryption**: Add encrypted storage adapter for sensitive data
- **Cloud sync**: Add adapter for cloud storage (Supabase, Firebase, etc.)
- **Compression**: Compress large data before storage
- **Migrations**: Add data migration system for schema changes
- **Versioning**: Track data versions for rollback capability

## Dependencies

### Current
- None (uses native APIs)

### Future (Tauri)
- `@tauri-apps/plugin-store` - For Tauri desktop storage

## License

MIT
