<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { InterestStorage, ResultNotesStorage, ResultStorage } from '$lib/storage';
  import type { FormattedResult, Interest, ResultNote } from '$lib/types';

  let interest = $state<Interest | null>(null);
  let results = $state<FormattedResult[]>([]);
  let notesByResultId = $state<Record<string, ResultNote[]>>({});
  let newNoteText = $state<Record<string, string>>({});

  let loading = $state(true);
  let error = $state<string | null>(null);

  function getStatus(result: FormattedResult): 'unread' | 'read' | 'archived' {
    return (result.status as 'unread' | 'read' | 'archived') ?? 'unread';
  }

  async function loadData() {
    loading = true;
    error = null;

    try {
      const { id } = get(page).params;
      if (!id) {
        error = 'No interest id provided in URL';
        return;
      }

      const [loadedInterest, loadedResults, loadedNotes] = await Promise.all([
        InterestStorage.getById(id),
        ResultStorage.getByInterestId(id),
        ResultNotesStorage.getByInterestId(id)
      ]);

      if (!loadedInterest) {
        error = 'Interest not found';
        return;
      }

      interest = loadedInterest;
      results = loadedResults;

      const grouped: Record<string, ResultNote[]> = {};
      for (const note of loadedNotes) {
        if (!grouped[note.resultId]) grouped[note.resultId] = [];
        grouped[note.resultId].push(note);
      }
      // Optionally sort notes by createdAt
      for (const key of Object.keys(grouped)) {
        grouped[key] = grouped[key].slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      }
      notesByResultId = grouped;
    } catch (e) {
      console.error('Failed to load results/notes', e);
      error = 'Failed to load results';
    } finally {
      loading = false;
    }
  }

  async function addNote(resultId: string) {
    if (!interest) return;

    const raw = newNoteText[resultId] ?? '';
    const body = raw.trim();
    if (!body) return;

    try {
      const note = await ResultNotesStorage.add(interest.id, {
        resultId,
        body
      });

      const existing = notesByResultId[resultId] ?? [];
      notesByResultId = {
        ...notesByResultId,
        [resultId]: [...existing, note]
      };

      newNoteText = { ...newNoteText, [resultId]: '' };
    } catch (e) {
      console.error('Failed to add note', e);
      alert('Failed to add note');
    }
  }

  async function deleteNote(resultId: string, noteId: string) {
    if (!interest) return;

    const confirmed = confirm('Delete this note?');
    if (!confirmed) return;

    try {
      const success = await ResultNotesStorage.delete(interest.id, noteId);
      if (!success) return;

      const remaining = (notesByResultId[resultId] ?? []).filter((n) => n.id !== noteId);
      notesByResultId = {
        ...notesByResultId,
        [resultId]: remaining
      };
    } catch (e) {
      console.error('Failed to delete note', e);
      alert('Failed to delete note');
    }
  }

  async function markResultAsRead(resultId: string) {
    if (!interest) return;
    try {
      const updated = await ResultStorage.markAsRead(interest.id, resultId);
      if (!updated) return;
      results = results.map((r) => (r.id === resultId ? updated : r));
    } catch (e) {
      console.error('Failed to mark result as read', e);
      alert('Failed to mark result as read');
    }
  }

  async function markResultAsUnread(resultId: string) {
    if (!interest) return;
    try {
      const updated = await ResultStorage.markAsUnread(interest.id, resultId);
      if (!updated) return;
      results = results.map((r) => (r.id === resultId ? updated : r));
    } catch (e) {
      console.error('Failed to mark result as unread', e);
      alert('Failed to mark result as unread');
    }
  }

  async function archiveResult(resultId: string) {
    if (!interest) return;
    try {
      const updated = await ResultStorage.archiveResult(interest.id, resultId);
      if (!updated) return;
      results = results.map((r) => (r.id === resultId ? updated : r));
    } catch (e) {
      console.error('Failed to archive result', e);
      alert('Failed to archive result');
    }
  }

  async function deleteResult(resultId: string) {
    if (!interest) return;

    const noteCount = (notesByResultId[resultId] ?? []).length;
    const message = noteCount > 0
      ? `This summary has ${noteCount} note${noteCount === 1 ? '' : 's'}. Deleting it will also delete its notes. Continue?`
      : 'Delete this summary?';

    const confirmed = confirm(message);
    if (!confirmed) return;

    try {
      // Delete the result itself
      const success = await ResultStorage.deleteResult(interest.id, resultId);
      if (!success) return;

      // Delete any associated notes on disk and in memory
      if (noteCount > 0) {
        await ResultNotesStorage.deleteByResultId(interest.id, resultId);
      }

      results = results.filter((r) => r.id !== resultId);
      const { [resultId]: _removed, ...rest } = notesByResultId;
      notesByResultId = rest;
    } catch (e) {
      console.error('Failed to delete result', e);
      alert('Failed to delete result');
    }
  }

  onMount(loadData);
</script>

<div class="results-page">
  {#if loading}
    <div class="loading">Loading results…</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if !interest}
    <div class="error">Interest not found.</div>
  {:else}
    <header>
      <div>
        <h1>{interest.name}</h1>
        {#if interest.description}
          <p class="subtitle">{interest.description}</p>
        {/if}
      </div>
      <a href="/interests" class="back-link">← Back to interests</a>
    </header>

    {#if results.length === 0}
      <div class="empty-state">
        <h2>No summaries yet</h2>
        <p>Run a search for this interest to generate your first summary.</p>
      </div>
    {:else}
      <ol class="results-list">
        {#each results as result}
          <li class="result-card">
            <article>
              <header class="result-header">
                <div class="result-header-main">
                  <h2>{result.summary}</h2>
                  <p class="meta">
                    Generated {new Date(result.generatedAt).toLocaleString()}
                  </p>
                  <span class={`status-badge status-${getStatus(result)}`}>
                    {#if getStatus(result) === 'archived'}
                      Archived
                    {:else if getStatus(result) === 'read'}
                      Read
                    {:else}
                      Unread
                    {/if}
                  </span>
                </div>
                <div class="result-actions" aria-label="Result actions">
                  {#if getStatus(result) === 'read'}
                    <button
                      type="button"
                      class="button-secondary"
                      onclick={() => markResultAsUnread(result.id)}
                    >
                      Mark as unread
                    </button>
                  {:else}
                    <button
                      type="button"
                      class="button-secondary"
                      onclick={() => markResultAsRead(result.id)}
                    >
                      Mark as read
                    </button>
                  {/if}

                  {#if getStatus(result) !== 'archived'}
                    <button
                      type="button"
                      class="button-secondary"
                      onclick={() => archiveResult(result.id)}
                    >
                      Archive
                    </button>
                  {/if}

                  <button
                    type="button"
                    class="button-danger"
                    onclick={() => deleteResult(result.id)}
                  >
                    Delete
                  </button>
                </div>
              </header>

              <section class="result-body">
                <div class="html" aria-label="AI generated summary" >
                  {@html result.formattedHtml}
                </div>

                {#if result.keyPoints && result.keyPoints.length > 0}
                  <div class="key-points">
                    <h3>Key points</h3>
                    <ul>
                      {#each result.keyPoints as point}
                        <li>{point}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                {#if result.sources && result.sources.length > 0}
                  <div class="sources">
                    <h3>Sources</h3>
                    <ul>
                      {#each result.sources as source}
                        <li>
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {source.title}
                          </a>
                          {#if source.date}
                            <span class="source-date">({source.date})</span>
                          {/if}
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </section>

              <section class="notes" aria-label="Notes for this result">
                <h3>Notes</h3>

                {#if (notesByResultId[result.id] || []).length === 0}
                  <p class="no-notes">No notes yet. Add one below.</p>
                {:else}
                  <ul class="notes-list">
                    {#each notesByResultId[result.id] as note}
                      <li class="note-item">
                        <p class="note-body">{note.body}</p>
                        <div class="note-meta">
                          <span>
                            Added {new Date(note.createdAt).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            class="note-delete"
                            onclick={() => deleteNote(result.id, note.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    {/each}
                  </ul>
                {/if}

                <form
                  class="note-form"
                  onsubmit={(e) => {e.preventDefault(); addNote(result.id);}}
                >
                  <label for={`note-${result.id}`}>
                    Add a note
                  </label>
                  <textarea
                    id={`note-${result.id}`}
                    rows="3"
                    placeholder="What is interesting or important about this summary?"
                    bind:value={newNoteText[result.id]}
                  ></textarea>
                  <div class="note-actions">
                    <button type="submit" class="button-primary">
                      Save note
                    </button>
                  </div>
                </form>
              </section>
            </article>
          </li>
        {/each}
      </ol>
    {/if}
  {/if}
</div>

<style>
  .results-page {
    max-width: 960px;
    margin: 0 auto;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: 600;
    color: #333;
    margin: 0;
  }

  .subtitle {
    margin-top: 0.25rem;
    color: #666;
  }

  .back-link {
    color: #1976d2;
    text-decoration: none;
    font-weight: 500;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .loading,
  .error,
  .empty-state {
    padding: 2rem;
    text-align: center;
  }

  .error {
    color: #d32f2f;
    background: #ffebee;
    border-radius: 8px;
  }

  .results-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .result-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .result-header-main h2 {
    font-size: 1.25rem;
    margin: 0 0 0.25rem 0;
  }

  .meta {
    font-size: 0.85rem;
    color: #666;
  }

  .result-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-top: 0.25rem;
  }

  .status-unread {
    background: #e3f2fd;
    color: #1565c0;
  }

  .status-read {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .status-archived {
    background: #eeeeee;
    color: #616161;
  }

  .result-body {
    margin-top: 1rem;
    display: grid;
    gap: 1rem;
  }

  .html {
    line-height: 1.6;
  }

  .key-points ul,
  .sources ul {
    padding-left: 1.25rem;
  }

  .sources a {
    color: #1976d2;
    text-decoration: none;
  }

  .sources a:hover {
    text-decoration: underline;
  }

  .source-date {
    color: #666;
    font-size: 0.85rem;
    margin-left: 0.25rem;
  }

  .notes {
    margin-top: 1.5rem;
    border-top: 1px solid #e0e0e0;
    padding-top: 1rem;
  }

  .notes h3 {
    font-size: 1rem;
    margin: 0 0 0.75rem 0;
  }

  .no-notes {
    font-size: 0.9rem;
    color: #666;
  }

  .notes-list {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .note-item {
    background: #fafafa;
    border-radius: 6px;
    padding: 0.75rem 1rem;
  }

  .note-body {
    margin: 0 0 0.5rem 0;
  }

  .note-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: #666;
  }

  .note-delete {
    border: none;
    background: none;
    color: #d32f2f;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .note-delete:hover {
    text-decoration: underline;
  }

  .note-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .note-form label {
    font-weight: 500;
    font-size: 0.9rem;
  }

  .note-form textarea {
    width: 100%;
    min-height: 4rem;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
    font-family: inherit;
    font-size: 0.9rem;
  }

  .note-actions {
    display: flex;
    justify-content: flex-end;
  }

  .button-primary {
    padding: 0.5rem 1rem;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
  }

  .button-primary:hover {
    background: #1565c0;
  }

  .button-secondary {
    padding: 0.35rem 0.75rem;
    background: #ffffff;
    color: #444;
    border-radius: 4px;
    border: 1px solid #d0d0d0;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .button-secondary:hover {
    background: #f5f5f5;
  }

  .button-danger {
    padding: 0.35rem 0.75rem;
    background: #d32f2f;
    color: #ffffff;
    border-radius: 4px;
    border: none;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .button-danger:hover {
    background: #b71c1c;
  }
</style>
