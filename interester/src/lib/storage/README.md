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
