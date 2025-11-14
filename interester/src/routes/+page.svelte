<script lang="ts">
  import { onMount } from 'svelte';
  import type { Interest } from '$lib/types';

  let interests = $state<Interest[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const response = await fetch('/api/interests');
      const result = await response.json();
      
      if (result.success) {
        interests = result.data || [];
      } else {
        error = result.error || 'Failed to load interests';
      }
    } catch (e) {
      error = 'Failed to connect to API';
      console.error(e);
    } finally {
      loading = false;
    }
  });
</script>

<div class="dashboard">
  <header>
    <h1>Dashboard</h1>
    <p class="subtitle">Your personalized content monitoring system</p>
  </header>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if interests.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <h2>No interests yet</h2>
      <p>Get started by creating your first interest to monitor</p>
      <a href="/interests" class="button-primary">Create Interest</a>
    </div>
  {:else}
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">{interests.length}</div>
        <div class="stat-label">Total Interests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{interests.filter(i => i.active).length}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">0</div>
        <div class="stat-label">Searches Today</div>
      </div>
    </div>

    <section class="interests-overview">
      <div class="section-header">
        <h2>Your Interests</h2>
        <a href="/interests" class="button-link">View All →</a>
      </div>
      
      <div class="interest-grid">
        {#each interests.slice(0, 6) as interest}
          <div class="interest-card">
            <div class="interest-header">
              <h3>{interest.name}</h3>
              <span class="status" class:active={interest.active}>
                {interest.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {#if interest.description}
              <p class="description">{interest.description}</p>
            {/if}
            <div class="tags">
              {#each interest.searchTerms.slice(0, 3) as term}
                <span class="tag">{term}</span>
              {/each}
              {#if interest.searchTerms.length > 3}
                <span class="tag more">+{interest.searchTerms.length - 3}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
  }

  header {
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: 600;
    color: #333;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    color: #666;
    font-size: 1rem;
    margin: 0;
  }

  .loading, .error {
    padding: 2rem;
    text-align: center;
    color: #666;
  }

  .error {
    color: #d32f2f;
    background: #ffebee;
    border-radius: 8px;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-state h2 {
    font-size: 1.5rem;
    color: #333;
    margin: 0 0 0.5rem 0;
  }

  .empty-state p {
    color: #666;
    margin: 0 0 1.5rem 0;
  }

  .button-primary {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: #1976d2;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 500;
    transition: background 0.2s;
  }

  .button-primary:hover {
    background: #1565c0;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: 600;
    color: #1976d2;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    color: #666;
    font-size: 0.9rem;
  }

  .interests-overview {
    margin-top: 3rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    font-size: 1.5rem;
    color: #333;
    margin: 0;
  }

  .button-link {
    color: #1976d2;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }

  .button-link:hover {
    color: #1565c0;
  }

  .interest-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .interest-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: box-shadow 0.2s;
  }

  .interest-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .interest-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .interest-card h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    margin: 0;
    flex: 1;
  }

  .status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    background: #e0e0e0;
    color: #666;
  }

  .status.active {
    background: #c8e6c9;
    color: #2e7d32;
  }

  .description {
    color: #666;
    font-size: 0.9rem;
    margin: 0 0 1rem 0;
    line-height: 1.5;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    padding: 0.25rem 0.75rem;
    background: #e3f2fd;
    color: #1976d2;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .tag.more {
    background: #f5f5f5;
    color: #666;
  }
</style>
