<script lang="ts">
import type { DiscreteItem } from "$lib/types";

const { item }: { item: DiscreteItem } = $props();
</script>

<article class="item-card news-card">
  <span class="item-type-badge">News</span>

  {#if item.imageUrl}
    <img src={item.imageUrl} alt={item.title} class="item-image" />
  {/if}

  <h4 class="item-title">{item.title}</h4>
  <p class="item-summary">{item.summary}</p>

  {#if item.url}
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      class="item-source-link"
    >{item.source || item.url}</a>
  {/if}
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
    color: #0369a1;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 4px;
    padding: 0.125rem 0.375rem;
    align-self: flex-start;
  }

  .item-image {
    width: 100%;
    max-height: 180px;
    object-fit: cover;
    border-radius: 4px;
  }

  .item-title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #111827;
  }

  .item-summary {
    margin: 0;
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.5;
  }

  .item-source-link {
    font-size: 0.8125rem;
    color: #2563eb;
    text-decoration: none;
    border: 1px solid #dbeafe;
    background: #eff6ff;
    border-radius: 4px;
    padding: 0.125rem 0.5rem;
    align-self: flex-start;
    transition: background 0.15s;
  }

  .item-source-link:hover {
    background: #dbeafe;
  }
</style>
