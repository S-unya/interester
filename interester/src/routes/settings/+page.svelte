<script lang="ts">
  import { onMount } from "svelte";
  import type { UserPreferences, IgnoreRule } from "$lib/types";

  let preferences = $state<UserPreferences | null>(null);
  let loading = $state(true);
  let saving = $state(false);

  // New Rule Form
  let showNewRuleForm = $state(false);
  let newRuleLabel = $state("");
  let newRulePattern = $state("");
  let newRuleType = $state<"domains" | "urlSubstrings" | "titleIncludes">(
    "domains",
  );

  async function loadPreferences() {
    loading = true;
    try {
      const response = await fetch("/api/preferences");
      const result = await response.json();
      if (result.success) {
        preferences = result.data;
      }
    } catch (e) {
      console.error("Failed to load preferences:", e);
    } finally {
      loading = false;
    }
  }

  async function savePreferences() {
    if (!preferences) return;
    saving = true;
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      const result = await response.json();
      if (result.success) {
        preferences = result.data;
      }
    } catch (e) {
      console.error("Failed to save preferences:", e);
    } finally {
      saving = false;
    }
  }

  function addRule() {
    if (!preferences || !newRuleLabel || !newRulePattern) return;

    const patterns = newRulePattern
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const newRule: IgnoreRule = {
      id: crypto.randomUUID(),
      label: newRuleLabel,
      active: true,
      createdAt: new Date().toISOString(),
      scope: "global",
      createdBy: "user",
      pattern: {
        [newRuleType]: patterns,
      },
    };

    preferences = {
      ...preferences,
      globalIgnoreRules: [...(preferences.globalIgnoreRules || []), newRule],
    };

    newRuleLabel = "";
    newRulePattern = "";
    showNewRuleForm = false;
    savePreferences();
  }

  function deleteRule(id: string) {
    if (!preferences || !preferences.globalIgnoreRules) return;
    preferences = {
      ...preferences,
      globalIgnoreRules: preferences.globalIgnoreRules.filter(
        (r) => r.id !== id,
      ),
    };
    savePreferences();
  }

  function toggleRule(id: string) {
    if (!preferences || !preferences.globalIgnoreRules) return;
    preferences = {
      ...preferences,
      globalIgnoreRules: preferences.globalIgnoreRules.map((r) =>
        r.id === id ? { ...r, active: !r.active } : r,
      ),
    };
    savePreferences();
  }

  onMount(loadPreferences);
</script>

<div class="settings-page">
  <header>
    <h1>Settings</h1>
    <p class="subtitle">
      Configure global application behavior and noise control
    </p>
  </header>

  {#if loading}
    <div class="loading">Loading settings...</div>
  {:else if !preferences}
    <div class="error">Failed to load settings. Please refresh the page.</div>
  {:else}
    <div class="settings-grid">
      <section class="settings-section">
        <div class="section-header">
          <h2>Noise Control (Global Ignore Rules)</h2>
          <button
            class="button-primary-sm"
            onclick={() => (showNewRuleForm = true)}>+ Add Rule</button
          >
        </div>
        <p class="section-desc">
          These rules apply to all interests. Use them to filter out spam
          domains or common irrelevant keywords.
        </p>

        {#if showNewRuleForm}
          <div class="rule-form">
            <div class="form-row">
              <div class="form-group">
                <label for="label">Rule Label</label>
                <input
                  id="label"
                  type="text"
                  bind:value={newRuleLabel}
                  placeholder="e.g., Domain Blocklist"
                />
              </div>
              <div class="form-group">
                <label for="type">Filter Type</label>
                <select id="type" bind:value={newRuleType}>
                  <option value="domains">Domains</option>
                  <option value="urlSubstrings">URL Substrings</option>
                  <option value="titleIncludes">Title Keywords</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="pattern">Patterns (comma-separated)</label>
              <textarea
                id="pattern"
                bind:value={newRulePattern}
                placeholder="e.g., spam.com, ads.net"
              ></textarea>
            </div>
            <div class="form-actions">
              <button
                class="button-secondary"
                onclick={() => (showNewRuleForm = false)}>Cancel</button
              >
              <button class="button-primary" onclick={addRule}>Save Rule</button
              >
            </div>
          </div>
        {/if}

        <div class="rules-list">
          {#if !preferences.globalIgnoreRules || preferences.globalIgnoreRules.length === 0}
            <div class="empty-rules">No global ignore rules defined.</div>
          {:else}
            {#each preferences.globalIgnoreRules as rule}
              <div class="rule-item" class:inactive={!rule.active}>
                <div class="rule-main">
                  <div class="rule-header">
                    <strong>{rule.label}</strong>
                    <span class="rule-scope">Global</span>
                  </div>
                  <div class="rule-patterns">
                    {#if rule.pattern.domains}
                      <span class="pattern-tag"
                        >Domains: {rule.pattern.domains.join(", ")}</span
                      >
                    {/if}
                    {#if rule.pattern.urlSubstrings}
                      <span class="pattern-tag"
                        >URLs: {rule.pattern.urlSubstrings.join(", ")}</span
                      >
                    {/if}
                    {#if rule.pattern.titleIncludes}
                      <span class="pattern-tag"
                        >Titles: {rule.pattern.titleIncludes.join(", ")}</span
                      >
                    {/if}
                  </div>
                </div>
                <div class="rule-actions">
                  <button
                    class="toggle-btn"
                    class:on={rule.active}
                    onclick={() => toggleRule(rule.id)}
                  >
                    {rule.active ? "Enabled" : "Disabled"}
                  </button>
                  <button class="delete-btn" onclick={() => deleteRule(rule.id)}
                    >🗑️</button
                  >
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </section>

      <section class="settings-section">
        <h2>General Preferences</h2>
        <div class="pref-group">
          <label>
            <input
              type="checkbox"
              bind:checked={preferences.enableNotifications}
              onchange={savePreferences}
            />
            Enable System Notifications
          </label>
        </div>
        <div class="pref-group">
          <label for="max-results">Max Results per Search</label>
          <input
            id="max-results"
            type="number"
            bind:value={preferences.maxResultsPerSearch}
            onchange={savePreferences}
            min="1"
            max="50"
          />
        </div>
      </section>
    </div>
  {/if}
</div>

<style>
  .settings-page {
    max-width: 900px;
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
    margin-bottom: 2.5rem;
  }
  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.02em;
  }
  .subtitle {
    color: #666;
    font-size: 1.1rem;
  }

  .settings-grid {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .settings-section {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .section-header h2 {
    font-size: 1.5rem;
    margin: 0;
  }
  .section-desc {
    color: #666;
    margin: 0 0 2rem 0;
    font-size: 0.95rem;
  }

  /* Rules List */
  .rules-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .rule-item {
    padding: 1.25rem;
    border-radius: 12px;
    border: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s;
  }
  .rule-item.inactive {
    opacity: 0.6;
    background: #fafafa;
    border-style: dashed;
  }

  .rule-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  .rule-scope {
    font-size: 0.7rem;
    text-transform: uppercase;
    background: #e3f2fd;
    color: #1976d2;
    padding: 2px 8px;
    border-radius: 99px;
    font-weight: 700;
  }

  .pattern-tag {
    display: inline-block;
    font-size: 0.85rem;
    color: #666;
    background: #f5f5f5;
    padding: 2px 8px;
    border-radius: 6px;
    margin-top: 0.25rem;
  }

  .rule-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }
  .toggle-btn {
    padding: 4px 12px;
    border-radius: 99px;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    transition: all 0.2s;
  }
  .toggle-btn.on {
    background: #e8f5e9;
    color: #2e7d32;
    border-color: #a5d6a7;
  }
  .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 4px;
    border-radius: 6px;
  }
  .delete-btn:hover {
    background: #fee2e2;
  }

  /* Rule Form */
  .rule-form {
    background: #fcfcfc;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e0e0e0;
    margin-bottom: 2rem;
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  label {
    font-weight: 600;
    font-size: 0.9rem;
    color: #444;
  }
  input,
  textarea,
  select {
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-family: inherit;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .pref-group {
    margin-bottom: 1.5rem;
  }
  .pref-group label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
  }

  .button-primary-sm {
    padding: 6px 12px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .button-primary {
    padding: 10px 20px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }
  .button-secondary {
    padding: 10px 20px;
    background: white;
    color: #666;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  .loading {
    text-align: center;
    padding: 4rem;
    color: #666;
  }
  .error {
    text-align: center;
    padding: 2rem;
    background: #fff5f5;
    color: #c62828;
    border-radius: 12px;
  }
  .empty-rules {
    text-align: center;
    padding: 2rem;
    color: #999;
    border: 1px dashed #ddd;
    border-radius: 12px;
  }
</style>
