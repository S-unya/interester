<script lang="ts">
import { onMount } from "svelte";
import EmptyState from "$lib/components/EmptyState.svelte";
import InterestModal from "$lib/components/InterestModal.svelte";
import ResultsPane from "$lib/components/ResultsPane.svelte";
import SettingsModal from "$lib/components/SettingsModal.svelte";
import Sidebar from "$lib/components/Sidebar.svelte";
import Toast from "$lib/components/Toast.svelte";
import { startScheduler } from "$lib/scheduler";
import { InterestStorage } from "$lib/storage/interests";
import { PreferencesStorage } from "$lib/storage/preferences";
import type { Interest } from "$lib/types";

// ── Navigation / modal state ──────────────────────────────────────────────────
let activeInterestId = $state<string | null>(null);
let sidebarOpen = $state(false); // toggled on mobile; set on mount based on viewport
let editingInterestId = $state<string | null>(null);
let settingsMissingKeys = $state(false);

// Individual modal open flags — bits-ui Dialog.Root bind:open sets these
// directly when the dialog closes itself (close button, Cancel, backdrop, Esc).
let settingsOpen = $state(false);
let interestModalOpen = $state(false);

// ── Interest list (owned here; passed to Sidebar) ─────────────────────────────
let interests = $state<Interest[]>([]);

// ── Viewport breakpoint ───────────────────────────────────────────────────────
const SIDEBAR_BREAKPOINT = 768;

function isMobile(): boolean {
	if (typeof window === "undefined") return false;
	return window.innerWidth < SIDEBAR_BREAKPOINT;
}

// ── Persist lastActiveInterestId when it changes ─────────────────────────────
$effect(() => {
	if (activeInterestId !== null) {
		PreferencesStorage.update({ lastActiveInterestId: activeInterestId }).catch(
			(e) =>
				console.error("[AppShell] Failed to persist lastActiveInterestId", e),
		);
	}
});

// ── Load data on mount, start scheduler ──────────────────────────────────────
let stopScheduler: (() => void) | undefined;

async function initApp() {
	// Set sidebar open/closed based on viewport
	sidebarOpen = !isMobile();

	// Load interests
	try {
		interests = await InterestStorage.getAll();
	} catch (e) {
		console.error("[AppShell] Failed to load interests", e);
	}

	// Restore last active interest
	try {
		const prefs = await PreferencesStorage.get();
		if (prefs.lastActiveInterestId) {
			const exists = interests.some((i) => i.id === prefs.lastActiveInterestId);
			if (exists) {
				activeInterestId = prefs.lastActiveInterestId;
			} else if (interests.length > 0) {
				activeInterestId = interests[0].id;
			}
		} else if (interests.length > 0) {
			activeInterestId = interests[0].id;
		}
	} catch (e) {
		console.error("[AppShell] Failed to restore last active interest", e);
	}

	// Start scheduler
	startScheduler()
		.then((stop) => {
			stopScheduler = stop;
		})
		.catch((e) => console.error("[AppShell] Scheduler failed to start", e));
}

onMount(() => {
	initApp();

	// Handle viewport resize
	function handleResize() {
		if (!isMobile()) {
			sidebarOpen = true;
		}
	}
	window.addEventListener("resize", handleResize);

	return () => {
		window.removeEventListener("resize", handleResize);
		if (stopScheduler) stopScheduler();
	};
});

// ── Refresh interest list (called after add/edit/delete) ──────────────────────
async function refreshInterests() {
	try {
		interests = await InterestStorage.getAll();
	} catch (e) {
		console.error("[AppShell] Failed to refresh interests", e);
	}
}

// ── Event handlers wired to Sidebar ──────────────────────────────────────────
function handleSelectInterest(id: string) {
	activeInterestId = id;
	if (isMobile()) sidebarOpen = false;
}

function handleAddInterest() {
	editingInterestId = null;
	interestModalOpen = true;
}

function handleEditInterest(id: string) {
	editingInterestId = id;
	interestModalOpen = true;
}

function handleDeleteInterest(id: string) {
	if (activeInterestId === id) {
		const remaining = interests.filter((i) => i.id !== id);
		activeInterestId = remaining.length > 0 ? remaining[0].id : null;
	}
	refreshInterests();
}

async function handleRunScan(id: string) {
	// Full scan implementation lives in ResultsPane (Issue 10).
	// For now this is a no-op placeholder.
	console.log("[AppShell] Run scan requested for:", id);
}

function handleOpenSettings(missingKeys = false) {
	settingsMissingKeys = missingKeys;
	settingsOpen = true;
}

function handleInterestSaved() {
	interestModalOpen = false;
	editingInterestId = null;
	refreshInterests();
}

const activeInterest = $derived(
	interests.find((i) => i.id === activeInterestId) ?? null,
);

const editingInterest = $derived(
	editingInterestId
		? (interests.find((i) => i.id === editingInterestId) ?? undefined)
		: undefined,
);
</script>

<div class="app-shell">
  <!-- Sidebar overlay backdrop on mobile -->
  {#if sidebarOpen && isMobile()}
    <div
      class="sidebar-backdrop"
      role="button"
      tabindex="-1"
      aria-label="Close sidebar"
      onclick={() => (sidebarOpen = false)}
      onkeydown={(e) => e.key === "Escape" && (sidebarOpen = false)}
    ></div>
  {/if}

  <!-- Sidebar: positioned/translated by AppShell, content owned by Sidebar component -->
  <div class="sidebar-wrapper" class:sidebar-wrapper--open={sidebarOpen}>
    <Sidebar
      {interests}
      {activeInterestId}
      onSelectInterest={handleSelectInterest}
      onAddInterest={handleAddInterest}
      onEditInterest={handleEditInterest}
      onRunScan={handleRunScan}
      onDeleteInterest={handleDeleteInterest}
      onOpenSettings={() => handleOpenSettings()}
    />
  </div>

  <!-- Main pane -->
  <main class="main-pane">
    <header class="main-header">
      <button
        class="hamburger"
        onclick={() => (sidebarOpen = !sidebarOpen)}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <h1 class="main-title">
        {activeInterest ? activeInterest.name : "Interester"}
      </h1>
    </header>

    <div class="main-content">
      {#if interests.length === 0}
        <EmptyState onopenSettings={() => handleOpenSettings()} />
      {:else if !activeInterest}
        <div class="content-stub">
          <p>Select an interest from the sidebar.</p>
        </div>
      {:else}
        <ResultsPane
          interest={activeInterest}
          onopenSettings={(missingKeys) => handleOpenSettings(missingKeys)}
        />
      {/if}
    </div>
  </main>
</div>

<!-- Modals -->
<SettingsModal
  bind:open={settingsOpen}
  missingKeys={settingsMissingKeys}
/>

<InterestModal
  bind:open={interestModalOpen}
  interest={editingInterest}
  onsave={handleInterestSaved}
/>

<Toast />

<style>
  .app-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
    position: relative;
    background: #f5f7fa;
  }

  /* ── Sidebar wrapper (handles positioning/animation) ─────────────────────── */

  .sidebar-wrapper {
    flex-shrink: 0;
    /* On mobile: absolutely positioned drawer that slides in/out */
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 40;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .sidebar-wrapper--open {
    transform: translateX(0);
  }

  @media (min-width: 768px) {
    .sidebar-wrapper {
      position: relative;
      transform: translateX(0) !important;
    }
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 39;
    background: rgba(0, 0, 0, 0.4);
  }

  /* ── Main pane ───────────────────────────────────────────────────────────── */

  .main-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .main-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;
  }

  .hamburger {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }

  .hamburger:hover {
    background: #f3f4f6;
    color: #111827;
  }

  .main-title {
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  /* ── Content stub (replaced in Issue 10) ────────────────────────────────── */

  .content-stub {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    height: 100%;
    min-height: 300px;
    text-align: center;
    color: #6b7280;
    font-size: 0.95rem;
  }
</style>
