<script lang="ts">
const {
	onopenSettings,
}: {
	onopenSettings: () => void;
} = $props();
</script>

<div class="empty-state">
  <div class="empty-state__icon" aria-hidden="true">
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  </div>

  <h2 class="empty-state__heading">Welcome to Interester</h2>

  <p class="empty-state__lead">
    Monitor topics you care about. Interester searches the web on a schedule and uses AI to
    summarise what's new — delivered straight to this sidebar.
  </p>

  <div class="empty-state__setup">
    <h3 class="empty-state__setup-heading">Before you start, you'll need:</h3>
    <ul class="empty-state__setup-list">
      <li>
        <strong>Serper API key</strong> — used to run Google Search queries.
        Get one free at <em>serper.dev</em>.
      </li>
      <li>
        <strong>AI provider key</strong> — used to summarise results.
        Supports OpenAI, Gemini, Anthropic, Ollama, and others.
      </li>
    </ul>
    <button class="empty-state__settings-btn" onclick={onopenSettings}>
      Configure API keys
    </button>
  </div>

  <p class="empty-state__next-step">
    Once configured, click the <strong>+</strong> button in the sidebar to add your first interest.
  </p>
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.25rem;
    max-width: 480px;
    margin: 0 auto;
    padding: 2rem 1rem;
    color: #374151;
  }

  .empty-state__icon {
    color: #9ca3af;
  }

  .empty-state__heading {
    font-size: 1.375rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .empty-state__lead {
    font-size: 0.9375rem;
    color: #6b7280;
    line-height: 1.6;
    margin: 0;
  }

  .empty-state__setup {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1.25rem 1.5rem;
    width: 100%;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .empty-state__setup-heading {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .empty-state__setup-list {
    margin: 0;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.5;
  }

  .empty-state__settings-btn {
    align-self: flex-start;
    padding: 0.5rem 1.125rem;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .empty-state__settings-btn:hover {
    background: #1d4ed8;
  }

  .empty-state__next-step {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }
</style>
