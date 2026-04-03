<script lang="ts">
import { Dialog } from "bits-ui";
import { onMount } from "svelte";
import { SecretStorage } from "$lib/secret-storage";
import { PreferencesStorage } from "$lib/storage/preferences";
import { toast } from "$lib/stores/toast";
import type { AiProvider, UserPreferences } from "$lib/types";

let { open = $bindable(false), missingKeys = false } = $props<{
	open: boolean;
	missingKeys?: boolean;
}>();

// Local form state — secrets held only in local state, never persisted to prefs
let serperApiKey = $state("");
let aiApiKey = $state("");

// Non-secret prefs
let prefs = $state<UserPreferences | null>(null);
let saving = $state(false);
let loading = $state(true);

const providers: { value: AiProvider; label: string }[] = [
	{ value: "google", label: "Google (Gemini)" },
	{ value: "openai", label: "OpenAI" },
	{ value: "anthropic", label: "Anthropic" },
	{ value: "bedrock", label: "AWS Bedrock" },
	{ value: "ollama", label: "Ollama (Local)" },
	{ value: "local", label: "Other Local API" },
];

async function load() {
	loading = true;
	try {
		const [loadedPrefs, existingSerper, existingAi] = await Promise.all([
			PreferencesStorage.get(),
			SecretStorage.getSecret("serper_api_key"),
			SecretStorage.getSecret("ai_api_key"),
		]);
		prefs = loadedPrefs;
		// Show masked placeholder if a key exists; leave empty if not set
		serperApiKey = existingSerper ? "••••••••" : "";
		aiApiKey = existingAi ? "••••••••" : "";
	} catch (e) {
		console.error("[SettingsModal] Failed to load settings:", e);
	} finally {
		loading = false;
	}
}

async function handleSave() {
	if (!prefs) return;
	saving = true;
	try {
		// Save secrets — only write if the user actually typed a new value
		// (masked placeholder "••••••••" means unchanged)
		if (serperApiKey && serperApiKey !== "••••••••") {
			await SecretStorage.setSecret("serper_api_key", serperApiKey);
		}
		if (aiApiKey && aiApiKey !== "••••••••") {
			await SecretStorage.setSecret("ai_api_key", aiApiKey);
		}

		// Save non-secret prefs — explicitly exclude any secret fields
		const { ...nonSecretPrefs } = prefs;
		await PreferencesStorage.save({
			...nonSecretPrefs,
			aiConfigured: true,
		});

		toast.success("Settings saved");
		open = false;
	} catch (e) {
		console.error("[SettingsModal] Failed to save settings:", e);
		toast.error("Failed to save settings");
	} finally {
		saving = false;
	}
}

// Reload when modal opens
$effect(() => {
	if (open) load();
});
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="modal-overlay" />
    <div class="modal-container">
      <Dialog.Content class="modal-content" aria-describedby="settings-desc">
        <div class="modal-header">
          <Dialog.Title class="modal-title">Settings</Dialog.Title>
          <Dialog.Close class="close-btn" aria-label="Close settings">✕</Dialog.Close>
        </div>

        {#if missingKeys}
          <div role="alert" class="missing-keys-banner">
            <strong>API keys required.</strong> Configure your Serper and AI keys below to run scans.
          </div>
        {/if}

        <p id="settings-desc" class="modal-description">
          Configure your API keys and application preferences.
        </p>

        {#if loading}
          <div class="loading">Loading settings...</div>
        {:else if prefs}
          <div class="settings-body">

            <!-- API Keys section -->
            <section class="settings-section">
              <h3 class="section-title">API Keys</h3>

              <div class="form-group">
                <label for="serper-key">Serper API Key</label>
                <input
                  id="serper-key"
                  type="password"
                  bind:value={serperApiKey}
                  placeholder="Enter Serper key…"
                  autocomplete="off"
                />
                <p class="field-hint">
                  Used for Google Search results. Get a key at serper.dev.
                </p>
              </div>

              <div class="form-group">
                <label for="ai-provider">AI Provider</label>
                <select id="ai-provider" bind:value={prefs.aiProvider}>
                  {#each providers as provider}
                    <option value={provider.value}>{provider.label}</option>
                  {/each}
                </select>
              </div>

              <div class="form-group">
                <label for="ai-key">AI API Key</label>
                <input
                  id="ai-key"
                  type="password"
                  bind:value={aiApiKey}
                  placeholder="Enter AI provider key…"
                  autocomplete="off"
                />
              </div>

              <div class="form-group">
                <label for="ai-url">Base URL <span class="optional">(optional)</span></label>
                <input
                  id="ai-url"
                  type="text"
                  bind:value={prefs.aiBaseUrl}
                  placeholder="e.g. http://localhost:11434/v1"
                />
                <p class="field-hint">Required for Ollama and custom local endpoints.</p>
              </div>

              <div class="form-group">
                <label for="ai-model">Model Name <span class="optional">(optional)</span></label>
                <input
                  id="ai-model"
                  type="text"
                  bind:value={prefs.aiModel}
                  placeholder="e.g. gemini-1.5-flash, gpt-4o, llama3"
                />
              </div>
            </section>

            <!-- General preferences section -->
            <section class="settings-section">
              <h3 class="section-title">General</h3>

              <div class="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    bind:checked={prefs.enableNotifications}
                  />
                  Enable system notifications
                </label>
              </div>

              <div class="form-group">
                <label for="max-results">Max results per scan</label>
                <input
                  id="max-results"
                  type="number"
                  bind:value={prefs.maxResultsPerSearch}
                  min="1"
                  max="50"
                />
              </div>
            </section>

          </div>

          <div class="modal-footer">
            <Dialog.Close class="btn-secondary">Cancel</Dialog.Close>
            <button class="btn-primary" onclick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        {/if}
      </Dialog.Content>
    </div>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.modal-overlay) {
    position: fixed;
    inset: 0;
    z-index: 50;
    background-color: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(3px);
  }

  .modal-container {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 51;
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    padding: 0 1rem;
  }

  :global(.modal-content) {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    overflow: hidden;
    outline: none;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
  }

  :global(.modal-title) {
    font-size: 1.125rem;
    font-weight: 700;
    color: #111;
    margin: 0;
  }

  :global(.close-btn) {
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    font-size: 1rem;
    padding: 0.25rem;
    border-radius: 4px;
    line-height: 1;
    transition: color 0.15s;
  }

  :global(.close-btn:hover) {
    color: #374151;
  }

  .missing-keys-banner {
    margin: 0;
    padding: 0.75rem 1.5rem;
    background: #fef3c7;
    border-bottom: 1px solid #fde68a;
    color: #92400e;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .modal-description {
    padding: 0.75rem 1.5rem 0;
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    flex-shrink: 0;
  }

  .settings-body {
    overflow-y: auto;
    padding: 1rem 1.5rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section-title {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9ca3af;
    margin: 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .optional {
    font-weight: 400;
    color: #9ca3af;
    font-size: 0.8rem;
  }

  .form-group input[type="text"],
  .form-group input[type="password"],
  .form-group input[type="number"],
  .form-group select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    font-family: inherit;
    background: #fff;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: 400;
  }

  .field-hint {
    font-size: 0.8rem;
    color: #9ca3af;
    margin: 0;
  }

  .loading {
    padding: 2rem 1.5rem;
    text-align: center;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid #f0f0f0;
    flex-shrink: 0;
  }

  .btn-primary {
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

  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.btn-secondary) {
    padding: 0.5rem 1.25rem;
    background: #fff;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  :global(.btn-secondary:hover) {
    background: #f9fafb;
  }
</style>
