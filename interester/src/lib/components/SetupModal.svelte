<script lang="ts">
    import { Dialog } from "bits-ui";
    import type { UserPreferences, AiProvider } from "$lib/types";
    import { fade, blur } from "svelte/transition";

    let { isOpen = $bindable(false), onSave } = $props<{
        isOpen: boolean;
        onSave: (prefs: Partial<UserPreferences>) => Promise<void>;
    }>();

    let step = $state(1);
    let saving = $state(false);

    // Form State
    let serperApiKey = $state("");
    let aiProvider = $state<AiProvider>("google");
    let aiApiKey = $state("");
    let aiBaseUrl = $state("");
    let aiModel = $state("");

    const providers: { value: AiProvider; label: string; icon: string }[] = [
        { value: "google", label: "Google (Gemini)", icon: "💎" },
        { value: "openai", label: "OpenAI (GPT)", icon: "🤖" },
        { value: "anthropic", label: "Anthropic (Claude)", icon: "🎭" },
        { value: "bedrock", label: "AWS Bedrock", icon: "☁️" },
        { value: "ollama", label: "Ollama (Local)", icon: "🦙" },
        { value: "local", label: "Other Local API", icon: "🏠" },
    ];

    async function handleSave() {
        saving = true;
        try {
            await onSave({
                serperApiKey,
                aiProvider,
                aiApiKey,
                aiBaseUrl,
                aiModel: aiModel || undefined,
                aiConfigured: true,
            });
            isOpen = false;
        } catch (e) {
            console.error("Failed to save setup:", e);
        } finally {
            saving = false;
        }
    }

    function nextStep() {
        if (step === 1 && serperApiKey) step = 2;
    }
</script>

<Dialog.Root bind:open={isOpen}>
    <Dialog.Portal>
        <Dialog.Overlay class="modal-overlay" />
        <div class="modal-container">
            <Dialog.Content class="modal-content">
                <div
                    class="modal-body"
                    transition:blur={{ duration: 300, amount: 10 }}
                >
                    <Dialog.Title class="modal-title">
                        Welcome to Interester
                    </Dialog.Title>
                    <Dialog.Description class="modal-description">
                        Let's get you set up with your search and AI keys.
                    </Dialog.Description>
                    <div class="setup-steps">
                        {#if step === 1}
                            <div class="step-content" transition:fade>
                                <h3 class="step-title">1. Search API</h3>
                                <p class="step-description">
                                    Interester uses <a
                                        href="https://serper.dev"
                                        target="_blank">Serper.dev</a
                                    > for Google Search results.
                                </p>

                                <div class="form-group">
                                    <label for="serper-key"
                                        >Serper API Key</label
                                    >
                                    <input
                                        id="serper-key"
                                        type="password"
                                        bind:value={serperApiKey}
                                        placeholder="Enter your Serper key..."
                                    />
                                </div>

                                <div class="form-actions">
                                    <button
                                        class="button-primary"
                                        disabled={!serperApiKey}
                                        onclick={nextStep}
                                    >
                                        Next Step →
                                    </button>
                                </div>
                            </div>
                        {:else}
                            <div class="step-content" transition:fade>
                                <div class="step-header">
                                    <button
                                        class="back-button"
                                        onclick={() => (step = 1)}>←</button
                                    >
                                    <h3 class="step-title">
                                        2. AI Model Provider
                                    </h3>
                                </div>

                                <div class="provider-grid">
                                    {#each providers as provider}
                                        <button
                                            class="provider-button"
                                            class:active={aiProvider ===
                                                provider.value}
                                            onclick={() =>
                                                (aiProvider = provider.value)}
                                        >
                                            <span class="provider-icon"
                                                >{provider.icon}</span
                                            >
                                            <span class="provider-label"
                                                >{provider.label}</span
                                            >
                                        </button>
                                    {/each}
                                </div>

                                <div class="form-fields">
                                    {#if aiProvider !== "ollama" && aiProvider !== "local"}
                                        <div class="form-group">
                                            <label for="ai-key">API Key</label>
                                            <input
                                                id="ai-key"
                                                type="password"
                                                bind:value={aiApiKey}
                                                placeholder="Enter API key..."
                                            />
                                        </div>
                                    {/if}

                                    {#if aiProvider === "local" || aiProvider === "ollama" || aiProvider === "openai"}
                                        <div class="form-group">
                                            <label for="ai-url"
                                                >Base URL (Optional)</label
                                            >
                                            <input
                                                id="ai-url"
                                                type="text"
                                                bind:value={aiBaseUrl}
                                                placeholder={aiProvider ===
                                                "ollama"
                                                    ? "http://localhost:11434/v1"
                                                    : "https://api.openai.com/v1"}
                                            />
                                        </div>
                                    {/if}

                                    <div class="form-group">
                                        <label for="ai-model"
                                            >Model Name (Optional)</label
                                        >
                                        <input
                                            id="ai-model"
                                            type="text"
                                            bind:value={aiModel}
                                            placeholder="e.g. gemini-1.5-flash, gpt-4o, llama3"
                                        />
                                    </div>
                                </div>

                                <div class="form-actions">
                                    <button
                                        class="button-primary"
                                        disabled={saving ||
                                            (!aiApiKey &&
                                                aiProvider !== "ollama" &&
                                                aiProvider !== "local")}
                                        onclick={handleSave}
                                    >
                                        {saving
                                            ? "Saving..."
                                            : "Finish Setup ✨"}
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </Dialog.Content>
        </div>
    </Dialog.Portal>
</Dialog.Root>

<style>
    .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        background-color: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        transition: opacity 200ms ease;
    }

    .modal-overlay[data-state="open"] {
        opacity: 1;
    }

    .modal-overlay[data-state="closed"] {
        opacity: 0;
    }

    .modal-container {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 50;
        width: 100%;
        max-width: 500px;
        padding: 0 1rem;
    }

    .modal-content {
        overflow: hidden;
        border-radius: 1rem;
        background-color: white;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        outline: none;
    }

    .modal-body {
        padding: 2rem;
    }

    .modal-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #111827;
        margin-bottom: 0.5rem;
    }

    .modal-description {
        color: #6b7280;
        margin-bottom: 2rem;
    }

    .step-title {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 1rem;
    }

    .step-description {
        font-size: 0.875rem;
        color: #4b5563;
        margin-bottom: 1.5rem;
    }

    .step-description a {
        color: #2563eb;
        text-decoration: none;
    }

    .step-description a:hover {
        text-decoration: underline;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .form-group label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
    }

    .form-group input {
        width: 100%;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        outline: none;
        transition: all 0.2s;
    }

    .form-group input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
    }

    .button-primary {
        padding: 0.75rem 1.5rem;
        background-color: #2563eb;
        color: white;
        border-radius: 0.75rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .button-primary:hover:not(:disabled) {
        background-color: #1d4ed8;
    }

    .button-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .step-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .back-button {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 1.25rem;
        transition: color 0.2s;
    }

    .back-button:hover {
        color: #4b5563;
    }

    .provider-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }

    .provider-button {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        border-radius: 0.75rem;
        border: 1px solid #f3f4f6;
        background-color: transparent;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s;
    }

    .provider-button:hover {
        background-color: #f9fafb;
    }

    .provider-button.active {
        border-color: #3b82f6;
        background-color: #eff6ff;
        box-shadow: 0 0 0 1px #3b82f6;
    }

    .provider-icon {
        font-size: 1.25rem;
    }

    .provider-label {
        font-size: 0.875rem;
        font-weight: 500;
    }

    .form-fields {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 2rem;
    }
</style>
