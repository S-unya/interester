<script lang="ts">
    import { onMount } from "svelte";
    import type { Interest, InterestCreateInput } from "$lib/types";
    import {
        InterestStorage,
        ResultStorage,
        initializeStorage,
    } from "$lib/storage";
    import { ScannerClient } from "$lib/scanner-client";
    import { toast } from "$lib/stores/toast";

    let interests = $state<Interest[]>([]);
    let loading = $state(true);
    let showForm = $state(false);
    let editingId = $state<string | null>(null);
    let scanningIds = $state<Set<string>>(new Set());

    // Form fields
    let formName = $state("");
    let formDescription = $state("");
    let formSearchTerms = $state("");
    let formMonitorUrls = $state("");
    let formContentTypes = $state<string[]>(["general"]);
    let formScheduleFrequency = $state<
        "hourly" | "daily" | "weekly" | "manual"
    >("manual");

    async function loadInterests() {
        loading = true;
        try {
            await initializeStorage();
            interests = await InterestStorage.getAll();
        } catch (e) {
            console.error("Failed to load interests:", e);
        } finally {
            loading = false;
        }
    }

    async function runInterest(id: string) {
        try {
            await initializeStorage();
            const interest = await InterestStorage.getById(id);
            if (!interest) {
                toast.error("Interest not found");
                return;
            }

            scanningIds.add(id);
            scanningIds = new Set(scanningIds); // Force reactivity

            const result = await ScannerClient.performScan(interest);

            // Save the result using the correct storage adapter
            const existing = await ResultStorage.getByInterestId(id);
            await ResultStorage.save(id, [result, ...existing]);

            // Update lastRanAt
            await InterestStorage.update(id, {
                lastRanAt: new Date().toISOString(),
            });

            await loadInterests();
            toast.success("Search completed successfully!");
        } catch (e) {
            console.error("Failed to run interest:", e);
            toast.error("Failed to run interest");
        } finally {
            scanningIds.delete(id);
            scanningIds = new Set(scanningIds); // Force reactivity
        }
    }

    async function saveInterest() {
        const searchTerms = formSearchTerms
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        const monitorUrls = formMonitorUrls
            .split("\n")
            .map((u) => u.trim())
            .filter(Boolean);

        if (!formName) {
            toast.error("Name is required");
            return;
        }

        try {
            await initializeStorage();
            if (editingId) {
                await InterestStorage.update(editingId, {
                    name: formName,
                    description: formDescription || undefined,
                    searchTerms,
                    monitorUrls:
                        monitorUrls.length > 0 ? monitorUrls : undefined,
                    scheduleFrequency: formScheduleFrequency,
                });
            } else {
                await InterestStorage.create({
                    name: formName,
                    description: formDescription || undefined,
                    searchTerms,
                    monitorUrls:
                        monitorUrls.length > 0 ? monitorUrls : undefined,
                    scheduleFrequency: formScheduleFrequency,
                    active: true,
                });
            }

            await loadInterests();
            resetForm();
            toast.success(editingId ? "Interest updated" : "Interest created");
        } catch (e) {
            console.error("Failed to save interest:", e);
            toast.error("Failed to save interest");
        }
    }

    async function deleteInterest(id: string) {
        if (!confirm("Are you sure you want to delete this interest?")) return;

        try {
            await initializeStorage();
            await InterestStorage.delete(id);
            await loadInterests();
        } catch (e) {
            console.error("Failed to delete interest:", e);
        }
    }

    function editInterest(interest: Interest) {
        editingId = interest.id;
        formName = interest.name;
        formDescription = interest.description || "";
        formSearchTerms = interest.searchTerms.join(", ");
        formMonitorUrls = (interest.monitorUrls || []).join("\n");
        formScheduleFrequency = interest.scheduleFrequency || "manual";
        showForm = true;
    }

    function resetForm() {
        editingId = null;
        formName = "";
        formDescription = "";
        formSearchTerms = "";
        formMonitorUrls = "";
        formScheduleFrequency = "manual";
        showForm = false;
    }

    // Shield/Ignore Rules Modal State
    let showIgnoreRulesModal = $state(false);
    let ruleTargetInterest = $state<Interest | null>(null);
    let showNewLocalRuleForm = $state(false);
    let localRuleLabel = $state("");
    let localRuleType = $state<"domains" | "urlSubstrings" | "titleIncludes">(
        "domains",
    );
    let localRulePattern = $state("");

    function openIgnoreRules(interest: Interest) {
        ruleTargetInterest = interest;
        showIgnoreRulesModal = true;
    }

    async function saveLocalRules() {
        if (!ruleTargetInterest) return;
        try {
            const response = await fetch(
                `/api/interests/${ruleTargetInterest.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ignoreRules: ruleTargetInterest.ignoreRules,
                    }),
                },
            );
            const result = await response.json();
            if (result.success) {
                interests = interests.map((i) =>
                    i.id === ruleTargetInterest!.id ? result.data : i,
                );
                ruleTargetInterest = result.data;
            }
        } catch (e) {
            console.error("Failed to save local rules:", e);
        }
    }

    function addLocalRule() {
        if (!ruleTargetInterest || !localRuleLabel || !localRulePattern) return;
        const patterns = localRulePattern
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const newRule: any = {
            id: crypto.randomUUID(),
            label: localRuleLabel,
            active: true,
            createdAt: new Date().toISOString(),
            scope: "interest",
            createdBy: "user",
            pattern: { [localRuleType]: patterns },
        };

        ruleTargetInterest.ignoreRules = [
            ...(ruleTargetInterest.ignoreRules || []),
            newRule,
        ];
        localRuleLabel = "";
        localRulePattern = "";
        showNewLocalRuleForm = false;
        saveLocalRules();
    }

    function toggleLocalRule(ruleId: string) {
        if (!ruleTargetInterest) return;
        ruleTargetInterest.ignoreRules = ruleTargetInterest.ignoreRules?.map(
            (r) => (r.id === ruleId ? { ...r, active: !r.active } : r),
        );
        saveLocalRules();
    }

    function deleteLocalRule(ruleId: string) {
        if (!ruleTargetInterest) return;
        ruleTargetInterest.ignoreRules = ruleTargetInterest.ignoreRules?.filter(
            (r) => r.id !== ruleId,
        );
        saveLocalRules();
    }

    onMount(() => {
        loadInterests();
    });
</script>

<div class="interests-page">
    <header>
        <div>
            <h1>Interests</h1>
            <p class="subtitle">
                Manage what you want to monitor across the web
            </p>
        </div>
        <button class="button-primary" onclick={() => (showForm = true)}>
            + New Interest
        </button>
    </header>

    {#if showForm}
        <div class="form-modal">
            <div class="form-container">
                <div class="form-header">
                    <h2>{editingId ? "Edit Interest" : "New Interest"}</h2>
                    <button class="close-button" onclick={resetForm}>✕</button>
                </div>

                <form
                    onsubmit={(e) => {
                        e.preventDefault();
                        saveInterest();
                    }}
                >
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
                        <label for="searchTerms"
                            >Search Terms (comma-separated)</label
                        >
                        <input
                            id="searchTerms"
                            type="text"
                            bind:value={formSearchTerms}
                            placeholder="AI, machine learning, GPT"
                        />
                    </div>

                    <div class="form-group">
                        <label for="monitorUrls"
                            >Monitor URLs (one per line, optional)</label
                        >
                        <textarea
                            id="monitorUrls"
                            bind:value={formMonitorUrls}
                            placeholder="https://example.com/blog"
                            rows="3"
                        ></textarea>
                    </div>

                    <div class="form-group">
                        <label for="schedule">Schedule Frequency</label>
                        <select
                            id="schedule"
                            bind:value={formScheduleFrequency}
                        >
                            <option value="manual">Manual Only</option>
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                        </select>
                    </div>

                    <div class="form-actions">
                        <button
                            type="button"
                            class="button-secondary"
                            onclick={resetForm}
                        >
                            Cancel
                        </button>
                        <button type="submit" class="button-primary">
                            {editingId ? "Update" : "Create"}
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
        <section class="interests-list" aria-labelledby="interests">
            <header><h2 id="interests">Interests</h2></header>
            <ol>
                {#each interests as interest, index}
                    <li class="interest-item">
                        <div class="interest-content">
                            <div class="interest-header">
                                <h3>{interest.name}</h3>
                                <span
                                    class="status"
                                    class:active={interest.active}
                                >
                                    {interest.active ? "Active" : "Inactive"}
                                </span>
                            </div>

                            {#if interest.description}
                                <p class="description">
                                    {interest.description}
                                </p>
                            {/if}

                            <div class="meta">
                                <div class="search-terms">
                                    <strong>Search terms:</strong>
                                    <ul>
                                        {#each interest.searchTerms as term}
                                            <li class="search-term">{term}</li>
                                        {/each}
                                    </ul>
                                </div>

                                {#if interest.monitorUrls && interest.monitorUrls.length > 0}
                                    <div class="monitor-urls">
                                        <strong>Monitoring:</strong>
                                        <ul>
                                            {#each interest.monitorUrls as url}
                                                <li class="monitor-url">
                                                    {url}
                                                </li>
                                            {/each}
                                        </ul>
                                    </div>
                                {/if}
                                <div class="schedule-info">
                                    <strong>Schedule:</strong>
                                    {interest.scheduleFrequency || "manual"}
                                    {#if interest.lastRanAt}
                                        <span class="last-run"
                                            >(Last run: {new Date(
                                                interest.lastRanAt,
                                            ).toLocaleString()})</span
                                        >
                                    {/if}
                                </div>
                            </div>
                        </div>

                        <div class="interest-actions">
                            <a
                                class="button-icon"
                                aria-label={`View ${interest.name} results`}
                                href={`/results/${interest.id}`}>👁️</a
                            >
                            <button
                                class="button-icon"
                                onclick={() => runInterest(interest.id)}
                                title="Run Search Now"
                                aria-label={scanningIds.has(interest.id)
                                    ? `Scan in progress for ${interest.name}`
                                    : `Run scan for ${interest.name}`}
                                disabled={scanningIds.has(interest.id)}
                            >
                                {#if scanningIds.has(interest.id)}
                                    <span class="spinner" aria-hidden="true"
                                        >⏳</span
                                    >
                                {:else}
                                    <span aria-hidden="true">▶️</span>
                                {/if}
                            </button>
                            <button
                                class="button-icon"
                                onclick={() => openIgnoreRules(interest)}
                                title="Noise Control (Ignore Rules)"
                                aria-label={`Manage ignore rules for ${interest.name}`}
                            >
                                <span aria-hidden="true">🛡️</span>
                            </button>
                            <button
                                class="button-icon"
                                onclick={() => editInterest(interest)}
                                aria-label={`Edit ${interest.name}`}
                            >
                                <span aria-hidden="true">✏️</span>
                            </button>
                            <button
                                class="button-icon"
                                onclick={() => deleteInterest(interest.id)}
                                aria-label={`Delete ${interest.name}`}
                            >
                                <span aria-hidden="true">🗑️</span>
                            </button>
                        </div>
                    </li>
                {/each}
            </ol>
        </section>
    {/if}

    {#if showIgnoreRulesModal && ruleTargetInterest}
        <div class="form-modal">
            <div class="form-container">
                <div class="form-header">
                    <h2>Noise Control: {ruleTargetInterest.name}</h2>
                    <button
                        class="close-button"
                        onclick={() => (showIgnoreRulesModal = false)}>✕</button
                    >
                </div>

                <div class="modal-body">
                    <div class="section-actions">
                        <button
                            class="button-primary-sm"
                            onclick={() =>
                                (showNewLocalRuleForm = !showNewLocalRuleForm)}
                        >
                            {showNewLocalRuleForm
                                ? "Cancel"
                                : "+ New Local Rule"}
                        </button>
                    </div>

                    {#if showNewLocalRuleForm}
                        <div class="local-rule-form">
                            <div class="form-group">
                                <label for="l-label">Rule Label</label>
                                <input
                                    id="l-label"
                                    type="text"
                                    bind:value={localRuleLabel}
                                    placeholder="e.g., Hide Promotions"
                                />
                            </div>
                            <div class="form-group">
                                <label for="l-type">Type</label>
                                <select id="l-type" bind:value={localRuleType}>
                                    <option value="domains">Domains</option>
                                    <option value="urlSubstrings"
                                        >URL Substrings</option
                                    >
                                    <option value="titleIncludes"
                                        >Title Keywords</option
                                    >
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="l-pattern"
                                    >Patterns (comma-separated)</label
                                >
                                <textarea
                                    id="l-pattern"
                                    bind:value={localRulePattern}
                                    placeholder="e.g., promo, deal"
                                ></textarea>
                            </div>
                            <button
                                class="button-primary"
                                onclick={addLocalRule}>Add Rule</button
                            >
                        </div>
                    {/if}

                    <div class="local-rules-list">
                        {#if !ruleTargetInterest.ignoreRules || ruleTargetInterest.ignoreRules.length === 0}
                            <div class="empty-rules">
                                No local rules for this interest.
                            </div>
                        {:else}
                            {#each ruleTargetInterest.ignoreRules as rule}
                                <div
                                    class="rule-mini-card"
                                    class:inactive={!rule.active}
                                >
                                    <div class="rule-info">
                                        <strong>{rule.label}</strong>
                                        <div class="rule-meta">
                                            {#if rule.pattern.domains}
                                                <span
                                                    >Domains: {rule.pattern.domains.join(
                                                        ", ",
                                                    )}</span
                                                >
                                            {/if}
                                            {#if rule.pattern.urlSubstrings}
                                                <span
                                                    >URLs: {rule.pattern.urlSubstrings.join(
                                                        ", ",
                                                    )}</span
                                                >
                                            {/if}
                                            {#if rule.pattern.titleIncludes}
                                                <span
                                                    >Titles: {rule.pattern.titleIncludes.join(
                                                        ", ",
                                                    )}</span
                                                >
                                            {/if}
                                        </div>
                                    </div>
                                    <div class="rule-btns">
                                        <button
                                            class="toggle-link"
                                            onclick={() =>
                                                toggleLocalRule(rule.id)}
                                        >
                                            {rule.active ? "Disable" : "Enable"}
                                        </button>
                                        <button
                                            class="delete-link"
                                            onclick={() =>
                                                deleteLocalRule(rule.id)}
                                            >Delete</button
                                        >
                                    </div>
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .interests-page {
        max-width: 1000px;
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

    .modal-body {
        padding: 1.5rem;
    }
    .section-actions {
        margin-bottom: 1.5rem;
    }

    .local-rule-form {
        background: #f9f9f9;
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid #eee;
        margin-bottom: 1.5rem;
    }

    .local-rules-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .rule-mini-card {
        padding: 1rem;
        border: 1px solid #eee;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .rule-mini-card.inactive {
        opacity: 0.5;
        background: #fafafa;
        border-style: dashed;
    }

    .rule-meta {
        font-size: 0.8rem;
        color: #777;
        margin-top: 0.25rem;
    }
    .rule-btns {
        display: flex;
        gap: 1rem;
        font-size: 0.85rem;
    }
    .toggle-link {
        background: none;
        border: none;
        color: #1976d2;
        cursor: pointer;
        font-weight: 600;
        padding: 0;
    }
    .delete-link {
        background: none;
        border: none;
        color: #d32f2f;
        cursor: pointer;
        font-weight: 600;
        padding: 0;
    }

    .empty-rules {
        text-align: center;
        padding: 2rem;
        color: #999;
        border: 1px dashed #eee;
        border-radius: 8px;
    }

    .button-primary-sm {
        padding: 6px 12px;
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
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

    .button-icon:hover:not(:disabled) {
        opacity: 1;
    }

    .button-icon:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }

    .spinner {
        display: inline-block;
        animation: spin 2s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .form-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
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
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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
    textarea,
    select {
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
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
