<script lang="ts">
import { DropdownMenu } from "bits-ui";
import type { FormattedResult, Interest } from "$lib/types";

const {
	interests,
	activeInterestId,
	onSelectInterest,
	onAddInterest,
	onEditInterest,
	onRunScan,
	onDeleteInterest,
	onOpenSettings,
}: {
	interests: Interest[];
	activeInterestId: string | null;
	onSelectInterest: (id: string) => void;
	onAddInterest: () => void;
	onEditInterest: (id: string) => void;
	onRunScan: (id: string) => void;
	onDeleteInterest: (id: string) => void;
	onOpenSettings: () => void;
} = $props();

// Track which interest has delete confirm pending
let confirmDeleteId = $state<string | null>(null);

function handleDeleteClick(id: string) {
	confirmDeleteId = id;
}

function handleDeleteConfirm(id: string) {
	confirmDeleteId = null;
	onDeleteInterest(id);
}

function handleDeleteCancel() {
	confirmDeleteId = null;
}

const sorted = $derived(
	[...interests].sort((a, b) => a.name.localeCompare(b.name)),
);
</script>

<aside class="sidebar" aria-label="Interests navigation" id="app-sidebar">
  <!-- Top: app name + add button -->
  <div class="sidebar-top">
    <span class="app-name">Interester</span>
    <button
      class="add-btn"
      onclick={onAddInterest}
      aria-label="Add new interest"
      title="Add interest"
    >+</button>
  </div>

  <!-- Interest list -->
  <nav class="interest-list" aria-label="Interests">
    {#if sorted.length === 0}
      <p class="sidebar-empty">No interests yet.</p>
    {:else}
      <ul role="list">
        {#each sorted as interest (interest.id)}
          <li class="interest-item">
            <!-- Row button -->
            <button
              class="interest-row"
              class:interest-row--active={interest.id === activeInterestId}
              onclick={() => onSelectInterest(interest.id)}
              aria-current={interest.id === activeInterestId ? "page" : undefined}
            >
              <span class="interest-name">{interest.name}</span>
            </button>

            <!-- Three-dot menu -->
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                class="menu-trigger"
                aria-label={`Options for ${interest.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="12" cy="19" r="2"/>
                </svg>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content class="menu-content" sideOffset={4} align="end">
                  {#if confirmDeleteId === interest.id}
                    <!-- Inline delete confirmation -->
                    <div class="confirm-delete">
                      <p class="confirm-text">Delete "{interest.name}"?</p>
                      <div class="confirm-btns">
                        <button
                          class="confirm-yes"
                          onclick={() => handleDeleteConfirm(interest.id)}
                        >Delete</button>
                        <button
                          class="confirm-no"
                          onclick={handleDeleteCancel}
                        >Cancel</button>
                      </div>
                    </div>
                  {:else}
                    <DropdownMenu.Item
                      class="menu-item"
                      onclick={() => onEditInterest(interest.id)}
                    >
                      Edit
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      class="menu-item"
                      onclick={() => onRunScan(interest.id)}
                    >
                      Run scan now
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator class="menu-separator" />
                    <DropdownMenu.Item
                      class="menu-item menu-item--danger"
                      onclick={() => handleDeleteClick(interest.id)}
                    >
                      Delete
                    </DropdownMenu.Item>
                  {/if}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </li>
        {/each}
      </ul>
    {/if}
  </nav>

  <!-- Bottom: settings gear -->
  <div class="sidebar-bottom">
    <button
      class="settings-btn"
      onclick={onOpenSettings}
      aria-label="Open settings"
      title="Settings"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  </div>
</aside>

<style>
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    background: #1e1f26;
    color: #c9cdd4;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }

  /* ── Top ────────────────────────────────────────────────────────────────── */

  .sidebar-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1rem 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    flex-shrink: 0;
  }

  .app-name {
    font-size: 1rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.01em;
  }

  .add-btn {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #c9cdd4;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }

  .add-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  /* ── Interest list ─────────────────────────────────────────────────────── */

  .interest-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
  }

  .interest-list ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .interest-item {
    display: flex;
    align-items: center;
    position: relative;
  }

  .interest-item:hover .interest-row {
    padding-right: 2rem; /* make room for the trigger when hovering */
  }

  .interest-row {
    display: flex;
    align-items: center;
    flex: 1;
    padding: 0.55rem 1rem;
    background: none;
    border: none;
    color: #8b9096;
    font-size: 0.9rem;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    min-width: 0;
    gap: 0.5rem;
  }

  .interest-row:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #d1d5db;
  }

  .interest-row--active {
    background: rgba(59, 130, 246, 0.2);
    color: #fff;
    font-weight: 600;
  }

  .interest-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar-empty {
    padding: 1rem;
    font-size: 0.85rem;
    color: #5a5f66;
    text-align: center;
  }

  /* ── Three-dot trigger ─────────────────────────────────────────────────── */

  :global(.menu-trigger) {
    position: absolute;
    right: 0.5rem;
    background: none;
    border: none;
    color: #5a5f66;
    cursor: pointer;
    padding: 0.3rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s, background 0.15s, color 0.15s;
  }

  .interest-item:hover :global(.menu-trigger),
  :global(.menu-trigger[data-state="open"]) {
    opacity: 1;
  }

  :global(.menu-trigger:hover) {
    background: rgba(255, 255, 255, 0.1);
    color: #d1d5db;
  }

  /* ── Dropdown menu content ─────────────────────────────────────────────── */

  :global(.menu-content) {
    background: #2a2b34;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.25rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    min-width: 140px;
    z-index: 100;
  }

  :global(.menu-item) {
    display: block;
    width: 100%;
    padding: 0.45rem 0.75rem;
    background: none;
    border: none;
    color: #c9cdd4;
    font-size: 0.875rem;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    border-radius: 5px;
    transition: background 0.1s, color 0.1s;
  }

  :global(.menu-item:hover),
  :global(.menu-item[data-highlighted]) {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    outline: none;
  }

  :global(.menu-item--danger) {
    color: #f87171;
  }

  :global(.menu-item--danger:hover),
  :global(.menu-item--danger[data-highlighted]) {
    background: rgba(248, 113, 113, 0.12);
    color: #fca5a5;
  }

  :global(.menu-separator) {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 0.25rem 0;
  }

  /* ── Inline delete confirmation ────────────────────────────────────────── */

  .confirm-delete {
    padding: 0.6rem 0.75rem;
  }

  .confirm-text {
    font-size: 0.8rem;
    color: #f87171;
    margin: 0 0 0.5rem;
    font-weight: 600;
  }

  .confirm-btns {
    display: flex;
    gap: 0.5rem;
  }

  .confirm-yes {
    flex: 1;
    padding: 0.3rem;
    background: #ef4444;
    color: #fff;
    border: none;
    border-radius: 5px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }

  .confirm-yes:hover {
    background: #dc2626;
  }

  .confirm-no {
    flex: 1;
    padding: 0.3rem;
    background: rgba(255, 255, 255, 0.08);
    color: #c9cdd4;
    border: none;
    border-radius: 5px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .confirm-no:hover {
    background: rgba(255, 255, 255, 0.14);
  }

  /* ── Bottom ────────────────────────────────────────────────────────────── */

  .sidebar-bottom {
    flex-shrink: 0;
    padding: 0.75rem 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }

  .settings-btn {
    background: none;
    border: none;
    color: #8b9096;
    cursor: pointer;
    padding: 0.35rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }

  .settings-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #d1d5db;
  }
</style>
