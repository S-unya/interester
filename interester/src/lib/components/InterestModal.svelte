<script lang="ts">
import { Dialog } from "bits-ui";
import { InterestStorage } from "$lib/storage/interests";
import { toast } from "$lib/stores/toast";
import type { ContentType, Interest } from "$lib/types";

let {
	open = $bindable(false),
	interest = undefined,
	onsave = undefined,
}: {
	open: boolean;
	interest?: Interest;
	onsave?: () => void;
} = $props();

const isEditMode = $derived(interest !== undefined);

// ── Form fields — initialised from props so they're ready on first render ─────
let name = $state(interest?.name ?? "");
let description = $state(interest?.description ?? "");
let searchTerms = $state<string[]>(interest ? [...interest.searchTerms] : []);
let termInput = $state("");

// Advanced fields
let showAdvanced = $state(false);
let scheduleFrequency = $state<"hourly" | "daily" | "weekly" | "manual">(
	interest?.scheduleFrequency ?? "daily",
);
let monitorUrls = $state((interest?.monitorUrls ?? []).join("\n"));
let resultRetentionDays = $state(interest?.resultRetentionDays ?? 30);
let contentType = $state<ContentType>(interest?.contentType ?? "general");

// ── Validation errors ─────────────────────────────────────────────────────────
let nameError = $state("");
let termsError = $state("");
let saving = $state(false);

// Track the previous open value so we only reset when the modal re-opens
let prevOpen = $state(open);

// ── Reset/populate form when the modal transitions from closed → open ─────────
$effect(() => {
	const isOpening = open && !prevOpen;
	prevOpen = open;

	if (isOpening) {
		if (interest) {
			name = interest.name;
			description = interest.description ?? "";
			searchTerms = [...interest.searchTerms];
			scheduleFrequency = interest.scheduleFrequency ?? "daily";
			monitorUrls = (interest.monitorUrls ?? []).join("\n");
			resultRetentionDays = interest.resultRetentionDays ?? 30;
			contentType = interest.contentType ?? "general";
		} else {
			name = "";
			description = "";
			searchTerms = [];
			termInput = "";
			scheduleFrequency = "daily";
			monitorUrls = "";
			resultRetentionDays = 30;
			contentType = "general";
		}
		nameError = "";
		termsError = "";
		showAdvanced = false;
		saving = false;
	}
});

// ── Search term input handling ────────────────────────────────────────────────
function addTerm() {
	const value = termInput.trim().replace(/,$/, "").trim();
	if (value && !searchTerms.includes(value)) {
		searchTerms = [...searchTerms, value];
	}
	termInput = "";
}

function handleTermKeydown(e: KeyboardEvent) {
	if (e.key === "Enter" || e.key === ",") {
		e.preventDefault();
		addTerm();
	}
}

function removeTerm(term: string) {
	searchTerms = searchTerms.filter((t) => t !== term);
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit() {
	// Flush any uncommitted term input before validating
	if (termInput.trim()) addTerm();

	nameError = "";
	termsError = "";

	let valid = true;
	if (!name.trim()) {
		nameError = "Name is required";
		valid = false;
	}
	if (searchTerms.length === 0) {
		termsError = "At least one search term is required";
		valid = false;
	}
	if (!valid) return;

	saving = true;
	try {
		const parsedUrls = monitorUrls
			.split("\n")
			.map((u) => u.trim())
			.filter(Boolean);

		if (isEditMode && interest) {
			await InterestStorage.update(interest.id, {
				name: name.trim(),
				description: description.trim() || undefined,
				searchTerms,
				scheduleFrequency,
				monitorUrls: parsedUrls,
				resultRetentionDays,
				contentType,
			});
			toast.success("Interest updated");
		} else {
			await InterestStorage.create({
				name: name.trim(),
				description: description.trim() || undefined,
				searchTerms,
				active: true,
				scheduleFrequency,
				monitorUrls: parsedUrls,
				resultRetentionDays,
				contentType,
				ignoreRules: [],
			});
			toast.success("Interest created");
		}

		onsave?.();
		open = false;
	} catch (e) {
		console.error("[InterestModal] Save failed", e);
		toast.error("Failed to save interest");
	} finally {
		saving = false;
	}
}
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="im-overlay" />
    <div class="im-container">
      <Dialog.Content
        class="im-content"
        aria-describedby="im-desc"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div class="im-header">
          <Dialog.Title class="im-title">
            {isEditMode ? "Edit interest" : "Add interest"}
          </Dialog.Title>
          <Dialog.Close class="im-close" aria-label="Close">✕</Dialog.Close>
        </div>

        <p id="im-desc" class="im-description">
          {isEditMode ? "Update this interest's details." : "Configure a new interest to monitor."}
        </p>

        <div class="im-body">
          <!-- Name -->
          <div class="form-group">
            <label for="im-name">Name</label>
            <input
              id="im-name"
              type="text"
              bind:value={name}
              placeholder="e.g. AI Research"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "im-name-error" : undefined}
            />
            {#if nameError}
              <p id="im-name-error" class="field-error" role="alert">{nameError}</p>
            {/if}
          </div>

          <!-- Description -->
          <div class="form-group">
            <label for="im-desc-field">
              Description <span class="optional">(optional)</span>
            </label>
            <textarea
              id="im-desc-field"
              bind:value={description}
              rows="2"
              placeholder="Brief description of what you want to track…"
            ></textarea>
          </div>

          <!-- Search terms -->
          <div class="form-group">
            <label for="im-terms-input">Search terms</label>
            <div class="tags-field" class:tags-field--error={!!termsError}>
              {#each searchTerms as term}
                <span class="tag">
                  {term}
                  <button
                    type="button"
                    class="tag-remove"
                    aria-label="Remove {term}"
                    onclick={() => removeTerm(term)}
                  >×</button>
                </span>
              {/each}
              <input
                id="im-terms-input"
                type="text"
                bind:value={termInput}
                placeholder="Add a search term…"
                onkeydown={handleTermKeydown}
                autocomplete="off"
              />
            </div>
            <p class="field-hint">Press Enter or comma to add each term.</p>
            {#if termsError}
              <p class="field-error" role="alert">{termsError}</p>
            {/if}
          </div>

          <!-- Advanced toggle -->
          <button
            type="button"
            class="advanced-toggle"
            onclick={() => (showAdvanced = !showAdvanced)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? "Hide advanced options" : "Show advanced options"}
          </button>

          {#if showAdvanced}
            <div class="advanced-section">
              <!-- Schedule frequency -->
              <div class="form-group">
                <label for="im-frequency">Schedule frequency</label>
                <select id="im-frequency" bind:value={scheduleFrequency}>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <!-- Content type -->
              <div class="form-group">
                <label for="im-content-type">Content type</label>
                <select id="im-content-type" bind:value={contentType}>
                  <option value="general">General</option>
                  <option value="news">News</option>
                  <option value="events">Events</option>
                  <option value="articles">Articles</option>
                  <option value="discussions">Discussions</option>
                </select>
              </div>

              <!-- Monitor URLs -->
              <div class="form-group">
                <label for="im-monitor-urls">
                  Monitor URLs <span class="optional">(optional, one per line)</span>
                </label>
                <textarea
                  id="im-monitor-urls"
                  bind:value={monitorUrls}
                  rows="3"
                  placeholder="https://example.com/feed"
                ></textarea>
              </div>

              <!-- Result retention -->
              <div class="form-group">
                <label for="im-retention">Result retention (days)</label>
                <input
                  id="im-retention"
                  type="number"
                  bind:value={resultRetentionDays}
                  min="1"
                  max="365"
                />
              </div>

              <!-- Ignore rules (display only) -->
              {#if interest?.ignoreRules && interest.ignoreRules.length > 0}
                <div class="form-group">
                  <p class="section-label">Ignore rules</p>
                  <ul class="ignore-rules-list">
                    {#each interest.ignoreRules as rule}
                      <li>{rule.label}</li>
                    {/each}
                  </ul>
                  <p class="field-hint">Ignore rules are managed automatically.</p>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="im-footer">
          <Dialog.Close class="im-btn-secondary">Cancel</Dialog.Close>
          <button
            type="button"
            class="im-btn-primary"
            onclick={handleSubmit}
            disabled={saving}
          >
            {#if saving}
              Saving…
            {:else if isEditMode}
              Update
            {:else}
              Create
            {/if}
          </button>
        </div>
      </Dialog.Content>
    </div>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.im-overlay) {
    position: fixed;
    inset: 0;
    z-index: 50;
    background-color: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(3px);
  }

  .im-container {
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

  :global(.im-content) {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    overflow: hidden;
    outline: none;
  }

  .im-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
  }

  :global(.im-title) {
    font-size: 1.125rem;
    font-weight: 700;
    color: #111;
    margin: 0;
  }

  :global(.im-close) {
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

  :global(.im-close:hover) {
    color: #374151;
  }

  .im-description {
    padding: 0.75rem 1.5rem 0;
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    flex-shrink: 0;
  }

  .im-body {
    overflow-y: auto;
    padding: 1rem 1.5rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-group label,
  .section-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin: 0;
  }

  .optional {
    font-weight: 400;
    color: #9ca3af;
    font-size: 0.8rem;
  }

  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group select,
  .form-group textarea {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    font-family: inherit;
    background: #fff;
    transition: border-color 0.15s, box-shadow 0.15s;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  .form-group input[aria-invalid="true"] {
    border-color: #ef4444;
  }

  /* ── Tag-style search terms input ────────────────────────────────────────── */

  .tags-field {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    padding: 0.375rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    cursor: text;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .tags-field:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  .tags-field--error {
    border-color: #ef4444;
  }

  .tags-field input {
    border: none;
    outline: none;
    padding: 0.125rem 0.25rem;
    font-size: 0.875rem;
    font-family: inherit;
    background: transparent;
    flex: 1;
    min-width: 120px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    background: #dbeafe;
    color: #1e40af;
    border-radius: 4px;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .tag-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: #3b82f6;
    font-size: 1rem;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
    transition: color 0.1s;
  }

  .tag-remove:hover {
    color: #1e40af;
  }

  /* ── Advanced section ────────────────────────────────────────────────────── */

  .advanced-toggle {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.8125rem;
    color: #3b82f6;
    padding: 0;
    text-align: left;
    font-weight: 500;
    transition: color 0.15s;
  }

  .advanced-toggle:hover {
    color: #1d4ed8;
  }

  .advanced-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }

  .ignore-rules-list {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.875rem;
    color: #374151;
  }

  /* ── Helpers ─────────────────────────────────────────────────────────────── */

  .field-hint {
    font-size: 0.8rem;
    color: #9ca3af;
    margin: 0;
  }

  .field-error {
    font-size: 0.8125rem;
    color: #ef4444;
    margin: 0;
  }

  /* ── Footer ──────────────────────────────────────────────────────────────── */

  .im-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid #f0f0f0;
    flex-shrink: 0;
  }

  :global(.im-btn-secondary) {
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

  :global(.im-btn-secondary:hover) {
    background: #f9fafb;
  }

  .im-btn-primary {
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

  .im-btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .im-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
