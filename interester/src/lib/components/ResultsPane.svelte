<script lang="ts">
import { onMount } from "svelte";
import { ScannerClient } from "$lib/scanner-client";
import { SecretStorage } from "$lib/secret-storage";
import { ResultStorage } from "$lib/storage/results";
import { toast } from "$lib/stores/toast";
import type { FormattedResult, Interest } from "$lib/types";
import EventCard from "./EventCard.svelte";
import GeneralCard from "./GeneralCard.svelte";
import NewsCard from "./NewsCard.svelte";
import OpinionCard from "./OpinionCard.svelte";
import ResourceCard from "./ResourceCard.svelte";

const {
	interest,
	onopenSettings,
}: {
	interest: Interest;
	onopenSettings: (missingKeys: boolean) => void;
} = $props();

let results = $state<FormattedResult[]>([]);
let scanning = $state(false);
let scrollAnchor: HTMLElement | undefined;

const RETENTION_MS = (days: number) => days * 24 * 60 * 60 * 1000;

async function loadResults() {
	try {
		const loaded = await ResultStorage.getByInterestId(interest.id);
		const retentionDays = interest.resultRetentionDays ?? 30;
		const cutoff = Date.now() - RETENTION_MS(retentionDays);
		// Chronological order: oldest first, filtered by retention
		results = loaded
			.filter((r) => new Date(r.generatedAt).getTime() >= cutoff)
			.sort(
				(a, b) =>
					new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
			);
	} catch (e) {
		console.error("[ResultsPane] Failed to load results", e);
	}
}

function scrollToBottom() {
	if (scrollAnchor && typeof scrollAnchor.scrollIntoView === "function") {
		scrollAnchor.scrollIntoView({ behavior: "smooth" });
	}
}

onMount(() => {
	loadResults().then(scrollToBottom);
});

// Reload results when the interest changes
$effect(() => {
	// Track interest.id reactively
	const id = interest.id;
	if (id) {
		loadResults().then(scrollToBottom);
	}
});

async function handleRunScan() {
	if (scanning) return;

	// Check both keys before proceeding
	const [serperKey, aiKey] = await Promise.all([
		SecretStorage.getSecret("serper_api_key"),
		SecretStorage.getSecret("ai_api_key"),
	]);

	if (!serperKey || !aiKey) {
		onopenSettings(true);
		return;
	}

	scanning = true;
	try {
		const newResult = await ScannerClient.performScan(interest);

		// Persist: append to existing results list
		const existing = await ResultStorage.getByInterestId(interest.id);
		await ResultStorage.save(interest.id, [...existing, newResult]);

		// Update local state in chronological order (retention filter applied)
		const retentionDays = interest.resultRetentionDays ?? 30;
		const cutoff = Date.now() - RETENTION_MS(retentionDays);
		results = [...results, newResult]
			.filter((r) => new Date(r.generatedAt).getTime() >= cutoff)
			.sort(
				(a, b) =>
					new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
			);

		toast.success("Scan complete");
		// Let the DOM update before scrolling
		setTimeout(scrollToBottom, 50);
	} catch (e) {
		console.error("[ResultsPane] Scan failed", e);
		toast.error("Scan failed. Check your API keys and try again.");
	} finally {
		scanning = false;
	}
}

async function handleMarkAsRead(result: FormattedResult) {
	if (result.status !== "unread") return;
	await ResultStorage.markAsRead(interest.id, result.id);
	results = results.map((r) =>
		r.id === result.id ? { ...r, status: "read" } : r,
	);
}
</script>

<div class="results-pane">
  <div class="results-list">
    {#if results.length === 0}
      <div class="results-empty">
        <p>No results yet for <strong>{interest.name}</strong>.</p>
        <p>Click "Run scan now" to fetch the latest content.</p>
      </div>
    {:else}
      {#each results as result (result.id)}
        <article class="result-card">
          <div class="result-card-header">
            {#if result.status === "unread"}
              <span class="unread-dot" aria-label="Unread"></span>
            {/if}
            <time class="result-time" datetime={result.generatedAt}>
              {new Date(result.generatedAt).toLocaleString()}
            </time>
            {#if result.status === "unread"}
              <button
                type="button"
                class="mark-read-btn"
                onclick={() => handleMarkAsRead(result)}
                aria-label="Mark as read"
              >Mark as read</button>
            {/if}
          </div>

          <p class="result-summary">{result.summary}</p>

          {#if result.keyPoints.length > 0}
            <ul class="result-key-points">
              {#each result.keyPoints as point}
                <li>{point}</li>
              {/each}
            </ul>
          {/if}

          {#if result.sources.length > 0}
            <div class="result-sources">
              {#each result.sources as source}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="result-source-link"
                >{source.title}</a>
              {/each}
            </div>
          {/if}

          {#if result.items.length > 0}
            <div class="result-items">
              {#each result.items as item (item.id)}
                {#if item.type === "event"}
                  <EventCard {item} />
                {:else if item.type === "news"}
                  <NewsCard {item} />
                {:else if item.type === "resource"}
                  <ResourceCard {item} />
                {:else if item.type === "opinion"}
                  <OpinionCard {item} />
                {:else}
                  <GeneralCard {item} />
                {/if}
              {/each}
            </div>
          {/if}
        </article>
      {/each}
    {/if}

    <!-- Scroll anchor — always rendered so scrollToBottom works even when empty -->
    <div bind:this={scrollAnchor} class="scroll-anchor" aria-hidden="true"></div>
  </div>

  <div class="results-footer">
    <button
      class="scan-btn"
      onclick={handleRunScan}
      disabled={scanning}
    >
      {scanning ? "Scanning…" : "Run scan now"}
    </button>
  </div>
</div>

<style>
  .results-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .results-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .results-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 200px;
    text-align: center;
    color: #6b7280;
    font-size: 0.9rem;
    gap: 0.5rem;
  }

  .results-empty p {
    margin: 0;
  }

  .result-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .result-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .unread-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #2563eb;
    flex-shrink: 0;
  }

  .mark-read-btn {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    color: #6b7280;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }

  .mark-read-btn:hover {
    color: #111827;
    background: #f3f4f6;
  }

  .result-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .result-summary {
    margin: 0;
    font-size: 0.9375rem;
    color: #111827;
    line-height: 1.6;
  }

  .result-key-points {
    margin: 0;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #374151;
  }

  .result-sources {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .result-source-link {
    font-size: 0.8125rem;
    color: #2563eb;
    text-decoration: none;
    border: 1px solid #dbeafe;
    background: #eff6ff;
    border-radius: 4px;
    padding: 0.125rem 0.5rem;
    transition: background 0.15s;
  }

  .result-source-link:hover {
    background: #dbeafe;
  }

  .result-time {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .scroll-anchor {
    height: 1px;
    flex-shrink: 0;
  }

  .results-footer {
    flex-shrink: 0;
    padding: 0.875rem 1.25rem;
    background: #fff;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
  }

  .scan-btn {
    padding: 0.5rem 1.25rem;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .scan-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .scan-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
