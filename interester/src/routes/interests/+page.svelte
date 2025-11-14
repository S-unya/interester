<script lang="ts">
  import { onMount } from 'svelte';
  import type { Interest, InterestCreateInput } from '$lib/types';
  
  let interests = $state<Interest[]>([]);
  let loading = $state(true);
  let showForm = $state(false);
  let editingId = $state<string | null>(null);
  
  // Form fields
  let formName = $state('');
  let formDescription = $state('');
  let formSearchTerms = $state('');
  let formMonitorUrls = $state('');
  let formContentTypes = $state<string[]>(['general']);

  async function loadInterests() {
    loading = true;
    try {
      const response = await fetch('/api/interests');
      const result = await response.json();
      if (result.success) {
        interests = result.data || [];
      }
    } catch (e) {
      console.error('Failed to load interests:', e);
    } finally {
      loading = false;
    }
  }

  async function saveInterest() {
    const searchTerms = formSearchTerms.split(',').map(t => t.trim()).filter(Boolean);
    const monitorUrls = formMonitorUrls.split('\n').map(u => u.trim()).filter(Boolean);
    
    if (!formName || searchTerms.length === 0) {
      alert('Name and at least one search term are required');
      return;
    }

    const payload: InterestCreateInput = {
      name: formName,
      description: formDescription || undefined,
      searchTerms,
      monitorUrls: monitorUrls.length > 0 ? monitorUrls : undefined,
      contentTypes: formContentTypes as any
    };

    try {
      const url = editingId ? `/api/interests/${editingId}` : '/api/interests';
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (result.success) {
        await loadInterests();
        resetForm();
      } else {
        alert(result.error || 'Failed to save interest');
      }
    } catch (e) {
      console.error('Failed to save interest:', e);
      alert('Failed to save interest');
    }
  }

  async function deleteInterest(id: string) {
    if (!confirm('Are you sure you want to delete this interest?')) return;
    
    try {
      const response = await fetch(`/api/interests/${id}`, { method: 'DELETE' });
      const result = await response.json();
      
      if (result.success) {
        await loadInterests();
      }
    } catch (e) {
      console.error('Failed to delete interest:', e);
    }
  }

  function editInterest(interest: Interest) {
    editingId = interest.id;
    formName = interest.name;
    formDescription = interest.description || '';
    formSearchTerms = interest.searchTerms.join(', ');
    formMonitorUrls = (interest.monitorUrls || []).join('\n');
    formContentTypes = interest.contentTypes;
    showForm = true;
  }

  function resetForm() {
    editingId = null;
    formName = '';
    formDescription = '';
    formSearchTerms = '';
    formMonitorUrls = '';
    formContentTypes = ['general'];
    showForm = false;
  }

  onMount(() => {
    loadInterests();
  });
</script>

<div class="interests-page">
  <header>
    <div>
      <h1>Interests</h1>
      <p class="subtitle">Manage what you want to monitor across the web</p>
    </div>
    <button class="button-primary" onclick={() => showForm = true}>
      + New Interest
    </button>
  </header>

  {#if showForm}
    <div class="form-modal">
      <div class="form-container">
        <div class="form-header">
          <h2>{editingId ? 'Edit Interest' : 'New Interest'}</h2>
          <button class="close-button" onclick={resetForm}>✕</button>
        </div>
        
        <form onsubmit={(e) => { e.preventDefault(); saveInterest(); }}>
          <div class="form-group">
            <label for="name">Name *</label>
            <input 
              id="name"
              type="text" 
              bind:value={formName} 
              placeholder="e.g., AI Development"
              required
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea 
              id="description"
              bind:value={formDescription} 
              placeholder="What is this interest about?"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="searchTerms">Search Terms * (comma-separated)</label>
            <input 
              id="searchTerms"
              type="text" 
              bind:value={formSearchTerms} 
              placeholder="AI, machine learning, GPT"
              required
            />
          </div>

          <div class="form-group">
            <label for="monitorUrls">Monitor URLs (one per line, optional)</label>
            <textarea 
              id="monitorUrls"
              bind:value={formMonitorUrls} 
              placeholder="https://example.com/blog"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Content Types</label>
            <div class="checkbox-group">
              {#each ['news', 'events', 'articles', 'discussions', 'general'] as type}
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    value={type}
                    checked={formContentTypes.includes(type)}
                    onchange={(e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.checked) {
                        formContentTypes = [...formContentTypes, type];
                      } else {
                        formContentTypes = formContentTypes.filter(t => t !== type);
                      }
                    }}
                  />
                  {type}
                </label>
              {/each}
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="button-secondary" onclick={resetForm}>
              Cancel
            </button>
            <button type="submit" class="button-primary">
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="loading">Loading interests...</div>
  {:else if interests.length === 0}
    <div class="empty-state">
      <div class="empty-icon">⭐</div>
      <h2>No interests yet</h2>
      <p>Create your first interest to start monitoring content</p>
    </div>
  {:else}
    <div class="interests-list">
      {#each interests as interest}
        <div class="interest-item">
          <div class="interest-content">
            <div class="interest-header">
              <h3>{interest.name}</h3>
              <span class="status" class:active={interest.active}>
                {interest.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            {#if interest.description}
              <p class="description">{interest.description}</p>
            {/if}
            
            <div class="meta">
              <div class="search-terms">
                <strong>Search:</strong>
                {#each interest.searchTerms as term, i}
                  {term}{i < interest.searchTerms.length - 1 ? ', ' : ''}
                {/each}
              </div>
              
              {#if interest.monitorUrls && interest.monitorUrls.length > 0}
                <div class="monitor-urls">
                  <strong>Monitoring:</strong> {interest.monitorUrls.length} URL(s)
                </div>
              {/if}
            </div>
          </div>
          
          <div class="interest-actions">
            <button class="button-icon" onclick={() => editInterest(interest)} title="Edit">
              ✏️
            </button>
            <button class="button-icon" onclick={() => deleteInterest(interest.id)} title="Delete">
              🗑️
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .interests-page {
    max-width: 1000px;
    margin: 0 auto;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    gap: 1rem;
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

  .button-primary {
    padding: 0.75rem 1.5rem;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .button-primary:hover {
    background: #1565c0;
  }

  .button-secondary {
    padding: 0.75rem 1.5rem;
    background: white;
    color: #666;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .button-secondary:hover {
    background: #f5f5f5;
    border-color: #ccc;
  }

  .button-icon {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.5rem;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .button-icon:hover {
    opacity: 1;
  }

  .form-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .form-container {
    background: white;
    border-radius: 12px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .form-header h2 {
    font-size: 1.5rem;
    margin: 0;
    color: #333;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .close-button:hover {
    background: #f5f5f5;
  }

  form {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    font-weight: 500;
    color: #333;
    margin-bottom: 0.5rem;
  }

  input[type="text"],
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  input[type="text"]:focus,
  textarea:focus {
    outline: none;
    border-color: #1976d2;
  }

  .checkbox-group {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: normal;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: #666;
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
    margin: 0;
  }

  .interests-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .interest-item {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .interest-content {
    flex: 1;
  }

  .interest-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .interest-item h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
    margin: 0;
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
    margin: 0 0 1rem 0;
    line-height: 1.5;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: #666;
  }

  .interest-actions {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }
</style>
