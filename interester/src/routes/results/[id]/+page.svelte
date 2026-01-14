<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";
  import {
    InterestStorage,
    ResultNotesStorage,
    ResultStorage,
  } from "$lib/storage";
  import { isTauri, generateId } from "$lib/utils";
  import type {
    FormattedResult,
    Interest,
    ResultNote,
    DiscreteItem,
  } from "$lib/types";

  let interest = $state<Interest | null>(null);
  let results = $state<FormattedResult[]>([]);
  let notesByResultId = $state<Record<string, ResultNote[]>>({});
  let newNoteText = $state<Record<string, string>>({});

  let loading = $state(true);
  let error = $state<string | null>(null);

  // Derived sorted results
  const sortedResults = $derived(
    [...results].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );
    }),
  );

  function getStatus(result: FormattedResult): "unread" | "read" | "archived" {
    return (result.status as "unread" | "read" | "archived") ?? "unread";
  }

  async function loadData() {
    loading = true;
    error = null;

    try {
      const { id } = get(page).params;
      if (!id) {
        error = "No interest id provided in URL";
        return;
      }

      const [loadedInterest, loadedResults, loadedNotes] = await Promise.all([
        InterestStorage.getById(id),
        ResultStorage.getByInterestId(id),
        ResultNotesStorage.getByInterestId(id),
      ]);

      if (!loadedInterest) {
        error = "Interest not found";
        return;
      }

      interest = loadedInterest;
      results = loadedResults;

      const grouped: Record<string, ResultNote[]> = {};
      for (const note of loadedNotes) {
        if (!grouped[note.resultId]) grouped[note.resultId] = [];
        grouped[note.resultId].push(note);
      }
      for (const key of Object.keys(grouped)) {
        grouped[key] = grouped[key]
          .slice()
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      }
      notesByResultId = grouped;
    } catch (e) {
      console.error("Failed to load results/notes", e);
      error = "Failed to load results";
    } finally {
      loading = false;
    }
  }

  async function addNote(resultId: string) {
    if (!interest) return;

    const raw = newNoteText[resultId] ?? "";
    const body = raw.trim();
    if (!body) return;

    try {
      const note = await ResultNotesStorage.add(interest.id, {
        resultId,
        body,
      });

      const existing = notesByResultId[resultId] ?? [];
      notesByResultId = {
        ...notesByResultId,
        [resultId]: [...existing, note],
      };

      newNoteText = { ...newNoteText, [resultId]: "" };
    } catch (e) {
      console.error("Failed to add note", e);
      alert("Failed to add note");
    }
  }

  async function deleteNote(resultId: string, noteId: string) {
    if (!interest) return;

    const confirmed = confirm("Delete this note?");
    if (!confirmed) return;

    try {
      const success = await ResultNotesStorage.delete(interest.id, noteId);
      if (!success) return;

      const remaining = (notesByResultId[resultId] ?? []).filter(
        (n) => n.id !== noteId,
      );
      notesByResultId = {
        ...notesByResultId,
        [resultId]: remaining,
      };
    } catch (e) {
      console.error("Failed to delete note", e);
      alert("Failed to delete note");
    }
  }

  async function markResultAsRead(resultId: string) {
    if (!interest) return;
    try {
      const updated = await ResultStorage.markAsRead(interest.id, resultId);
      if (!updated) return;
      results = results.map((r) => (r.id === resultId ? updated : r));
    } catch (e) {
      console.error("Failed to mark result as read", e);
      alert("Failed to mark result as read");
    }
  }

  async function markResultAsUnread(resultId: string) {
    if (!interest) return;
    try {
      const updated = await ResultStorage.markAsUnread(interest.id, resultId);
      if (!updated) return;
      results = results.map((r) => (r.id === resultId ? updated : r));
    } catch (e) {
      console.error("Failed to mark result as unread", e);
      alert("Failed to mark result as unread");
    }
  }

  async function archiveResult(resultId: string) {
    if (!interest) return;
    try {
      const updated = await ResultStorage.archiveResult(interest.id, resultId);
      if (!updated) return;
      results = results.map((r) => (r.id === resultId ? updated : r));
    } catch (e) {
      console.error("Failed to archive result", e);
      alert("Failed to archive result");
    }
  }

  async function deleteResult(resultId: string) {
    if (!interest) return;

    const noteCount = (notesByResultId[resultId] ?? []).length;
    const message =
      noteCount > 0
        ? `This summary has ${noteCount} note${noteCount === 1 ? "" : "s"}. Deleting it will also delete its notes. Continue?`
        : "Delete this summary?";

    const confirmed = confirm(message);
    if (!confirmed) return;

    try {
      const success = await ResultStorage.deleteResult(interest.id, resultId);
      if (!success) return;

      if (noteCount > 0) {
        await ResultNotesStorage.deleteByResultId(interest.id, resultId);
      }

      results = results.filter((r) => r.id !== resultId);
      const { [resultId]: _removed, ...rest } = notesByResultId;
      notesByResultId = rest;
    } catch (e) {
      console.error("Failed to delete result", e);
      alert("Failed to delete result");
    }
  }

  async function togglePin(resultId: string) {
    if (!interest) return;
    try {
      const updated = await ResultStorage.togglePin(interest.id, resultId);
      if (!updated) return;
      results = results.map((r) => (r.id === resultId ? updated : r));
    } catch (e) {
      console.error("Failed to toggle pin", e);
    }
  }

  // Calendar Helpers
  function getGoogleCalendarUrl(item: DiscreteItem) {
    const title = encodeURIComponent(item.title);
    const details = encodeURIComponent(
      item.summary + "\n\nSource: " + item.url,
    );
    const location = encodeURIComponent(item.location || "");

    // We try to parse the date. If it's invalid, we just open GCal without a specific time
    let dateStr = "";
    if (item.date) {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) {
        const iso = d.toISOString().replace(/-|:|\.\d+/g, "");
        dateStr = `&dates=${iso}/${iso}`; // Default to same start/end
      }
    }

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}${dateStr}`;
  }

  function downloadIcs(item: DiscreteItem) {
    const title = item.title;
    const details = item.summary + "\\n\\nSource: " + item.url;
    const location = item.location || "";

    let dateStr =
      "DTSTART:" + new Date().toISOString().replace(/-|:|\.\d+/g, "");
    if (item.date) {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) {
        dateStr = "DTSTART:" + d.toISOString().replace(/-|:|\.\d+/g, "");
      }
    }

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `SUMMARY:${title}`,
      `DESCRIPTION:${details}`,
      `LOCATION:${location}`,
      dateStr,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${title.replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Tauri Link Opener
  async function openExternal(url: string, e?: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isTauri()) {
      try {
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        if (typeof openUrl === "function") {
          await openUrl(url);
          return;
        }
        // Fallback if openUrl is not found (might be just 'open' in some versions/configs)
        const opener = (await import("@tauri-apps/plugin-opener")) as any;
        const openFunc = opener.openUrl || opener.open;
        if (typeof openFunc === "function") {
          await openFunc(url);
          return;
        }
      } catch (err) {
        console.error("Failed to open URL in Tauri:", err);
      }
    }

    // Web fallback or if Tauri call failed
    window.open(url, "_blank");
  }

  // Handle clicks on links inside the generated HTML
  function handleHtmlClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor && anchor.href) {
      openExternal(anchor.href, e);
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
      <div class="header-content">
        <a href="/interests" class="back-link">← Interests</a>
        <h1>{interest.name}</h1>
        {#if interest.description}
          <p class="subtitle">{interest.description}</p>
        {/if}
      </div>
    </header>

    {#if results.length === 0}
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h2>No summaries yet</h2>
        <p>Run a search for this interest to generate your first AI summary.</p>
        <div class="tip">
          <strong>Pro Tip:</strong> You can set a schedule in Settings to get these
          automatically.
        </div>
      </div>
    {:else}
      <ol class="results-list">
        {#each sortedResults as result}
          <li class="result-card" class:pinned={result.pinned}>
            <article>
              <header class="result-header">
                <div class="result-header-main">
                  <div class="title-row">
                    {#if result.pinned}
                      <span class="pinned-icon">📌</span>
                    {/if}
                    <h2>{result.summary}</h2>
                  </div>
                  <p class="meta">
                    {new Date(result.generatedAt).toLocaleString()}
                  </p>
                  <span class={`status-badge status-${getStatus(result)}`}>
                    {getStatus(result).toUpperCase()}
                  </span>
                </div>
                <div class="result-actions" aria-label="Result actions">
                  <button
                    type="button"
                    class="button-icon-action"
                    class:active={result.pinned}
                    onclick={() => togglePin(result.id)}
                    title={result.pinned ? "Unpin from top" : "Pin to top"}
                  >
                    {result.pinned ? "📌" : "📍"}
                  </button>

                  {#if getStatus(result) === "read"}
                    <button
                      type="button"
                      class="button-secondary"
                      onclick={() => markResultAsUnread(result.id)}
                      title="Mark as unread"
                    >
                      📩
                    </button>
                  {:else}
                    <button
                      type="button"
                      class="button-secondary"
                      onclick={() => markResultAsRead(result.id)}
                      title="Mark as read"
                    >
                      📖
                    </button>
                  {/if}

                  {#if getStatus(result) !== "archived"}
                    <button
                      type="button"
                      class="button-secondary"
                      onclick={() => archiveResult(result.id)}
                      title="Archive"
                    >
                      📦
                    </button>
                  {/if}

                  <button
                    type="button"
                    class="button-danger"
                    onclick={() => deleteResult(result.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </header>

              <section class="result-body">
                <button
                  class="html-summary-btn"
                  onclick={handleHtmlClick}
                  onkeydown={(e) =>
                    e.key === "Enter" && handleHtmlClick(e as any)}
                  type="button"
                >
                  {@html result.formattedHtml}
                </button>

                {#if result.items && result.items.length > 0}
                  <div class="discrete-items">
                    <h3>Highlights & Events</h3>
                    <div class="items-grid">
                      {#each [...result.items].sort((a, b) => {
                        if (a.type === "event" && b.type === "event" && a.date && b.date) {
                          return new Date(a.date).getTime() - new Date(b.date).getTime();
                        }
                        return 0;
                      }) as item}
                        <div class="item-card {item.type}">
                          <div class="item-header">
                            <span class="item-badge">{item.type}</span>
                            {#if item.date}
                              <span class="item-date">{item.date}</span>
                            {/if}
                          </div>
                          <h4>{item.title}</h4>
                          <p>{item.summary}</p>
                          {#if item.location}
                            <div class="item-location">📍 {item.location}</div>
                          {/if}
                          <div class="item-footer">
                            <button
                              class="link-btn"
                              onclick={(e) => openExternal(item.url, e)}
                            >
                              View Source
                            </button>
                            {#if item.type === "event"}
                              <div class="calendar-btns">
                                <button
                                  class="cal-btn"
                                  onclick={() =>
                                    openExternal(getGoogleCalendarUrl(item))}
                                  title="Add to Google Calendar"
                                >
                                  GCal
                                </button>
                                <button
                                  class="cal-btn"
                                  onclick={() => downloadIcs(item)}
                                  title="Download .ics file"
                                >
                                  ICS
                                </button>
                              </div>
                            {/if}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

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
                          <button
                            class="source-link-btn"
                            onclick={(e) => openExternal(source.url, e)}
                          >
                            {source.title}
                          </button>
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
                  <p class="no-notes">No notes yet.</p>
                {:else}
                  <ul class="notes-list">
                    {#each notesByResultId[result.id] as note}
                      <li class="note-item">
                        <p class="note-body">{note.body}</p>
                        <div class="note-meta">
                          <span>
                            {new Date(note.createdAt).toLocaleDateString()}
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
                  onsubmit={(e) => {
                    e.preventDefault();
                    addNote(result.id);
                  }}
                >
                  <textarea
                    id={`note-${result.id}`}
                    rows="1"
                    placeholder="Add a note..."
                    bind:value={newNoteText[result.id]}
                  ></textarea>
                  <button type="submit" class="button-primary-sm">
                    Save
                  </button>
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
    max-width: 900px;
    margin: 0 auto;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  header {
    margin-bottom: 3rem;
  }

  .back-link {
    display: inline-block;
    color: #1976d2;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    transition: transform 0.2s;
  }

  .back-link:hover {
    transform: translateX(-4px);
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .subtitle {
    margin-top: 0.5rem;
    font-size: 1.1rem;
    color: #666;
  }

  .results-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .result-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    padding: 2rem;
    transition: all 0.3s ease;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .result-card.pinned {
    border-color: #ffc107;
    background: #fffdf7;
    box-shadow: 0 10px 15px -3px rgba(255, 193, 7, 0.1);
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .pinned-icon {
    font-size: 1.25rem;
  }

  .result-header-main h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: #1a1a1a;
    line-height: 1.2;
  }

  .meta {
    font-size: 0.85rem;
    color: #999;
    margin: 0.5rem 0;
    font-weight: 500;
  }

  .result-actions {
    display: flex;
    gap: 0.5rem;
  }

  .status-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .status-unread {
    background: #e3f2fd;
    color: #1565c0;
  }
  .status-read {
    background: #f5f5f5;
    color: #666;
  }
  .status-archived {
    background: #eeeeee;
    color: #999;
  }

  .button-icon-action {
    background: none;
    border: 1px solid #eee;
    padding: 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .button-icon-action:hover {
    background: #fffde7;
    border-color: #ffc107;
  }
  .button-icon-action.active {
    background: #fffde7;
    border-color: #ffc107;
  }

  .button-secondary {
    background: white;
    border: 1px solid #eee;
    padding: 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .button-secondary:hover {
    background: #f5f5f5;
    border-color: #ccc;
  }

  .button-danger {
    background: #fff5f5;
    border: 1px solid #ffebee;
    padding: 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .button-danger:hover {
    background: #fee2e2;
    border-color: #fca5a5;
  }

  .result-body {
    line-height: 1.6;
    color: #444;
    font-size: 1.05rem;
  }

  .html-summary-btn {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    color: inherit;
    cursor: default;
  }

  .html-summary-btn :global(a) {
    color: #1976d2;
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
  }
  .html-summary-btn :global(a:hover) {
    text-decoration: underline;
  }

  .html-summary-btn :global(a) {
    color: #1976d2;
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
  }
  .html-summary-btn :global(a:hover) {
    text-decoration: underline;
  }

  .discrete-items {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #f0f0f0;
  }

  .discrete-items h3 {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1.25rem;
    color: #333;
  }

  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
  }

  .item-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .item-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
    border-color: #cbd5e1;
  }

  .item-card.event {
    background: #fffcf0;
    border-color: #fef3c7;
  }
  .item-card.news {
    background: #f0f9ff;
    border-color: #e0f2fe;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .item-badge {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 4px;
    background: #e2e8f0;
    color: #475569;
  }

  .item-card.event .item-badge {
    background: #fef3c7;
    color: #92400e;
  }
  .item-card.news .item-badge {
    background: #e0f2fe;
    color: #075985;
  }

  .item-date {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 500;
  }

  .item-card h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.3;
  }

  .item-card p {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    color: #475569;
    flex: 1;
    line-height: 1.5;
  }

  .item-location {
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .item-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding-top: 0.75rem;
  }

  .link-btn {
    background: none;
    border: none;
    color: #1976d2;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }

  .link-btn:hover {
    text-decoration: underline;
  }

  .calendar-btns {
    display: flex;
    gap: 0.5rem;
  }

  .cal-btn {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    color: #475569;
    transition: all 0.2s;
  }

  .cal-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #1e293b;
  }

  .source-link-btn {
    background: none;
    border: none;
    color: #1976d2;
    font-weight: 500;
    font-size: inherit;
    font-family: inherit;
    cursor: pointer;
    padding: 0;
    text-align: left;
  }

  .source-link-btn:hover {
    text-decoration: underline;
  }

  .key-points h3,
  .sources h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: 1.5rem 0 0.75rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .key-points ul,
  .sources ul {
    padding-left: 1.25rem;
    margin: 0;
  }

  .sources a {
    color: #1976d2;
    font-weight: 500;
  }

  .notes {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px dashed #eee;
  }

  .notes h3 {
    font-size: 1rem;
    margin: 0 0 1rem 0;
  }

  .notes-list {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .note-item {
    background: #f9f9f9;
    padding: 1rem;
    border-radius: 12px;
  }

  .note-body {
    margin: 0 0 0.5rem 0;
    font-size: 0.95rem;
  }

  .note-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #999;
    font-weight: 600;
  }

  .note-delete {
    background: none;
    border: none;
    color: #f44336;
    cursor: pointer;
    font-weight: 700;
  }

  .note-form {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .note-form textarea {
    flex: 1;
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 0.75rem;
    font-family: inherit;
    font-size: 0.9rem;
    transition: border-color 0.2s;
  }

  .note-form textarea:focus {
    outline: none;
    border-color: #1976d2;
  }

  .button-primary-sm {
    background: #1976d2;
    color: white;
    border: none;
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 1rem;
  }
  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
  }
  .tip {
    margin-top: 2rem;
    background: #e3f2fd;
    padding: 1rem;
    border-radius: 8px;
    display: inline-block;
    font-size: 0.9rem;
    color: #1565c0;
  }
</style>
