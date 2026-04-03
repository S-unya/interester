<script lang="ts">
import type { DiscreteItem } from "$lib/types";

const { item }: { item: DiscreteItem } = $props();
</script>

<article class="item-card resource-card">
  <span class="item-type-badge">Resource</span>

  <h4 class="item-title">
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      class="item-title-link"
    >{item.title}</a>
  </h4>

  <p class="item-summary">{item.summary}</p>

  {#if item.source}
    <span class="item-source">{item.source}</span>
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
    color: #047857;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 4px;
    padding: 0.125rem 0.375rem;
    align-self: flex-start;
  }

  .item-title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
  }

  .item-title-link {
    color: #2563eb;
    text-decoration: none;
  }

  .item-title-link:hover {
    text-decoration: underline;
  }

  .item-summary {
    margin: 0;
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.5;
  }

  .item-source {
    font-size: 0.8125rem;
    color: #6b7280;
  }
</style>
