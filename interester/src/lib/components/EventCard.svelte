<script lang="ts">
import type { DiscreteItem } from "$lib/types";
import { generateIcs } from "$lib/utils/ics";

const { item }: { item: DiscreteItem } = $props();

const calendarHref = $derived(
	"data:text/calendar;charset=utf-8," + encodeURIComponent(generateIcs(item)),
);
const filename = $derived(
	item.title.replace(/[^a-z0-9]/gi, "-").toLowerCase() + ".ics",
);
</script>

<article class="item-card event-card">
  <span class="item-type-badge">Event</span>
  <h4 class="item-title">{item.title}</h4>

  {#if item.date}
    <p class="item-date">{item.date}</p>
  {/if}

  {#if item.location}
    <p class="item-location">{item.location}</p>
  {/if}

  <p class="item-summary">{item.summary}</p>

  <div class="item-actions">
    {#if item.url}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        class="item-source-link"
      >{item.source || item.url}</a>
    {/if}

    <a
      href={calendarHref}
      download={filename}
      class="item-calendar-link"
    >Add to calendar</a>
  </div>
</article>

<style>
  .item-card {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    background: #fff;
  }

  .item-type-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #7c3aed;
    background: #f5f3ff;
    border: 1px solid #ede9fe;
    border-radius: 4px;
    padding: 0.125rem 0.375rem;
    align-self: flex-start;
  }

  .item-title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #111827;
  }

  .item-date,
  .item-location {
    margin: 0;
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .item-summary {
    margin: 0;
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.5;
  }

  .item-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .item-source-link,
  .item-calendar-link {
    font-size: 0.8125rem;
    text-decoration: none;
    border-radius: 4px;
    padding: 0.125rem 0.5rem;
    transition: background 0.15s;
  }

  .item-source-link {
    color: #2563eb;
    border: 1px solid #dbeafe;
    background: #eff6ff;
  }

  .item-source-link:hover {
    background: #dbeafe;
  }

  .item-calendar-link {
    color: #7c3aed;
    border: 1px solid #ede9fe;
    background: #f5f3ff;
  }

  .item-calendar-link:hover {
    background: #ede9fe;
  }
</style>
