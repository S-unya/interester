<script lang="ts">
  import { onMount } from "svelte";
  import type { Interest, FormattedResult } from "$lib/types";

  let interests = $state<Interest[]>([]);
  let recentActivity = $state<FormattedResult[]>([]);
  let loading = $state(true);
  let activityLoading = $state(true);
  let error = $state<string | null>(null);

  async function loadData() {
    loading = true;
    error = null;
    try {
      const response = await fetch("/api/interests");
      const result = await response.json();

      if (result.success) {
        interests = result.data || [];
      } else {
        error = result.error || "Failed to load interests";
      }
    } catch (e) {
      error = "Failed to connect to API";
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function loadActivity() {
    activityLoading = true;
    try {
      const response = await fetch("/api/activity");
      const result = await response.json();
      if (result.success) {
        recentActivity = result.data || [];
      }
    } catch (e) {
      console.error("Failed to load activity:", e);
    } finally {
      activityLoading = false;
    }
  }

  async function archiveActivity(result: FormattedResult) {
    try {
      const response = await fetch("/api/storage/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "archive",
          interestId: result.interestId,
          resultId: result.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        recentActivity = recentActivity.filter((r) => r.id !== result.id);
      }
    } catch (e) {
      console.error("Failed to archive activity:", e);
    }
  }

  async function markActivityRead(result: FormattedResult) {
    try {
      const response = await fetch("/api/storage/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markRead",
          interestId: result.interestId,
          resultId: result.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        recentActivity = recentActivity.map((r) =>
          r.id === result.id ? { ...r, status: "read" } : r,
        );
      }
    } catch (e) {
      console.error("Failed to mark activity read:", e);
    }
  }

  function getNextScheduledCheck(): string {
    // Very simplified: find the interest with a schedule and assume the next hour
    // In a real app, this would query the scheduler state
    const scheduled = interests.some(
      (i) =>
        i.active && i.scheduleFrequency && i.scheduleFrequency !== "manual",
    );
    if (!scheduled) return "No active schedule";

    const now = new Date();
    const next = new Date(now.getTime() + (60 - now.getMinutes()) * 60000);
    return `Next check: ~${next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  onMount(() => {
    loadData();
    loadActivity();
  });
</script>

<div class="dashboard">
  <header>
    <div class="header-main">
      <h1>Dashboard</h1>
      <p class="subtitle">Your personalized content monitoring system</p>
    </div>
    <div class="header-actions">
      <button
        class="button-secondary"
        onclick={() => {
          loadData();
          loadActivity();
        }}
        aria-label="Refresh Dashboard"
      >
        🔄 Refresh
      </button>
    </div>
  </header>

  {#if error}
    <div class="error-banner">
      <span class="error-icon">⚠️</span>
      <div class="error-content">
        <strong>Connection Error</strong>
        <p>{error}</p>
      </div>
    </div>
  {/if}

  <section class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon">⭐</div>
      <div class="stat-info">
        <div class="stat-value">{loading ? "..." : interests.length}</div>
        <div class="stat-label">Total Interests</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🔔</div>
      <div class="stat-info">
        <div class="stat-value">
          {activityLoading
            ? "..."
            : recentActivity.filter((r) => r.status === "unread").length}
        </div>
        <div class="stat-label">New Searches</div>
      </div>
    </div>
    <div class="stat-card highlight">
      <div class="stat-icon">🕒</div>
      <div class="stat-info">
        <div class="stat-value system-time">
          {loading ? "..." : interests.filter((i) => i.active).length}
        </div>
        <div class="stat-label">{getNextScheduledCheck()}</div>
      </div>
    </div>
  </section>

  <div class="dashboard-content">
    <section class="activity-section">
      <div class="section-header">
        <h2>Recent Activity</h2>
      </div>

      {#if activityLoading}
        <div class="skeleton-list">
          {#each Array(5) as _}
            <div class="skeleton-item"></div>
          {/each}
        </div>
      {:else if recentActivity.length === 0}
        <div class="empty-mini">
          <p>No recent activity found. Run a search to see updates here.</p>
        </div>
      {:else}
        <ul class="activity-list">
          {#each recentActivity as result}
            <li class="activity-item" class:unread={result.status === "unread"}>
              <div class="activity-content-wrapper">
                <a href={`/results/${result.interestId}`} class="activity-link">
                  <div class="activity-meta">
                    <span class="activity-time"
                      >{new Date(result.generatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}</span
                    >
                    <span class="activity-badge">Result</span>
                  </div>
                  <div class="activity-body">
                    <strong>{result.summary}</strong>
                    <p>{result.keyPoints?.[0] || "New content found."}</p>
                  </div>
                </a>
                <div class="activity-actions">
                  {#if result.status === "unread"}
                    <button
                      class="action-btn"
                      onclick={() => markActivityRead(result)}
                      title="Mark as read"
                    >
                      ✅
                    </button>
                  {/if}
                  <button
                    class="action-btn"
                    onclick={() => archiveActivity(result)}
                    title="Archive"
                  >
                    📦
                  </button>
                </div>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="interests-section">
      <div class="section-header">
        <h2>Interests Overview</h2>
        <a href="/interests" class="button-link">Manage All →</a>
      </div>

      {#if loading}
        <div class="interest-grid-skeleton">
          {#each Array(4) as _}
            <div class="skeleton-card"></div>
          {/each}
        </div>
      {:else if interests.length === 0}
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h2>Your journey starts here</h2>
          <p>
            Create your first interest to start monitoring the web for what
            matters to you.
          </p>
          <div class="onboarding-tips">
            <div class="tip-card">
              <span class="tip-icon">💡</span>
              <p>
                Try searching for your favorite <strong
                  >open source project</strong
                >
                or <strong>niche hobby</strong>.
              </p>
            </div>
            <div class="tip-card">
              <span class="tip-icon">🌐</span>
              <p>
                Monitor specific URLs like <strong>vandalism trackers</strong>
                or <strong>forum threads</strong>.
              </p>
            </div>
          </div>
          <a href="/interests" class="button-primary"
            >Create Your First Interest</a
          >
        </div>
      {:else}
        <div class="interest-grid">
          {#each interests.slice(0, 4) as interest}
            <a href={`/results/${interest.id}`} class="interest-card">
              <div class="interest-card-header">
                <h3>{interest.name}</h3>
                {#if interest.active}
                  <span class="pulse-dot" title="Actively monitoring"></span>
                {/if}
              </div>
              {#if interest.description}
                <p class="description">{interest.description}</p>
              {/if}
              <div class="tags">
                {#each interest.searchTerms.slice(0, 2) as term}
                  <span class="tag">{term}</span>
                {/each}
                {#if interest.searchTerms.length > 2}
                  <span class="tag more"
                    >+{interest.searchTerms.length - 2}</span
                  >
                {/if}
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    animation: fadeIn 0.4s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2.5rem;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.02em;
  }

  .subtitle {
    color: #666;
    font-size: 1.1rem;
    margin: 0;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.05),
      0 2px 4px -1px rgba(0, 0, 0, 0.03);
    display: flex;
    align-items: center;
    gap: 1.25rem;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .stat-card.highlight {
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    color: white;
  }

  .stat-card.highlight .stat-label {
    color: rgba(255, 255, 255, 0.8);
  }
  .stat-card.highlight .stat-value {
    color: white;
  }

  .stat-icon {
    font-size: 1.75rem;
    width: 48px;
    height: 48px;
    background: #f0f7ff;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-card.highlight .stat-icon {
    background: rgba(255, 255, 255, 0.2);
  }

  .stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1976d2;
    line-height: 1;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    color: #666;
    font-size: 0.9rem;
    font-weight: 500;
  }

  /* Dashboard Content Layout */
  .dashboard-content {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 2.5rem;
    align-items: start;
  }

  @media (max-width: 1024px) {
    .dashboard-content {
      grid-template-columns: 1fr;
    }
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
    margin: 0;
  }

  /* Activity Stream */
  .activity-section {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid rgba(0, 0, 0, 0.05);
    min-height: 400px;
  }

  .activity-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .activity-item {
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 1rem;
  }

  .activity-item:last-child {
    border-bottom: none;
  }

  .activity-content-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .activity-link {
    text-decoration: none;
    color: inherit;
    display: block;
    flex: 1;
    transition: opacity 0.2s;
  }

  .activity-link:hover {
    opacity: 0.8;
  }

  .activity-actions {
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .activity-item:hover .activity-actions {
    opacity: 1;
  }

  .action-btn {
    background: none;
    border: 1px solid #eee;
    border-radius: 6px;
    padding: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: #f5f5f5;
    border-color: #ccc;
  }

  .activity-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .activity-time {
    font-size: 0.75rem;
    color: #999;
    font-weight: 600;
  }
  .activity-badge {
    font-size: 0.7rem;
    background: #e3f2fd;
    color: #1976d2;
    padding: 2px 8px;
    border-radius: 99px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .activity-body strong {
    display: block;
    font-size: 0.95rem;
    color: #333;
    margin-bottom: 0.25rem;
    line-height: 1.3;
  }

  .activity-body p {
    font-size: 0.85rem;
    color: #777;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .activity-item.unread .activity-time {
    color: #1976d2;
  }
  .activity-item.unread::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    background: #d32f2f;
    border-radius: 50%;
    margin-right: 8px;
    vertical-align: middle;
  }

  /* Interest Grid */
  .interest-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .interest-card {
    background: white;
    padding: 1.75rem;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    text-decoration: none;
    color: inherit;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
  }

  .interest-card:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    border-color: #1976d2;
  }

  .interest-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .interest-card h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
    color: #1a1a1a;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    background: #4caf50;
    border-radius: 50%;
    position: relative;
  }

  .pulse-dot::after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    background: inherit;
    border-radius: inherit;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    100% {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  .description {
    color: #666;
    font-size: 0.9rem;
    line-height: 1.5;
    margin: 0 0 1.5rem 0;
    flex: 1;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 10px;
    background: #f5f5f5;
    color: #666;
    border-radius: 6px;
  }

  /* Skeletons */
  .skeleton-item {
    height: 80px;
    background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 12px;
    margin-bottom: 1rem;
  }

  .skeleton-card {
    height: 200px;
    background: #f0f0f0;
    border-radius: 16px;
    animation: loading 1.5s infinite;
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  /* Buttons */
  .button-secondary {
    padding: 0.5rem 1rem;
    border: 1px solid #e0e0e0;
    background: white;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .button-secondary:hover {
    background: #f9f9f9;
    border-color: #ccc;
  }

  .button-primary {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: #1976d2;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    transition: background 0.2s;
  }

  .button-primary:hover {
    background: #1565c0;
  }

  .button-link {
    font-size: 0.9rem;
    font-weight: 600;
    color: #1976d2;
    text-decoration: none;
  }

  .empty-state {
    text-align: center;
    padding: 6rem 2rem;
    background: #fdfdfd;
    border-radius: 24px;
    border: 2px dashed #eee;
  }

  .onboarding-tips {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    max-width: 800px;
    margin: 3rem auto;
    text-align: left;
  }

  .tip-card {
    background: white;
    padding: 1.5rem;
    border-radius: 16px;
    border: 1px solid #f0f0f0;
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
  }

  .tip-icon {
    font-size: 1.5rem;
  }
  .tip-card p {
    margin: 0;
    color: #555;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .empty-mini {
    text-align: center;
    padding: 2rem;
    color: #999;
    font-size: 0.9rem;
  }
  .error-banner {
    background: #fff5f5;
    border-left: 4px solid #f44336;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .error-icon {
    font-size: 1.25rem;
  }
  .error-content strong {
    display: block;
    color: #c62828;
    margin-bottom: 0.25rem;
  }
  .error-content p {
    margin: 0;
    color: #d32f2f;
    font-size: 0.9rem;
  }
</style>
