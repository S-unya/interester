<script lang="ts">
    import { toast } from "$lib/stores/toast";
    import { flip } from "svelte/animate";
    import { fade, fly } from "svelte/transition";
</script>

<div class="toast-container" aria-live="polite" role="status">
    {#each $toast as t (t.id)}
        <div
            class="toast {t.type}"
            role={t.type === "error" ? "alert" : "status"}
            aria-live={t.type === "error" ? "assertive" : "polite"}
            animate:flip={{ duration: 300 }}
            in:fly={{ y: 20, duration: 400 }}
            out:fade={{ duration: 200 }}
        >
            <div class="toast-content">
                {#if t.type === "success"}
                    <span class="icon" aria-hidden="true">✅</span>
                {:else if t.type === "error"}
                    <span class="icon" aria-hidden="true">❌</span>
                {:else}
                    <span class="icon" aria-hidden="true">ℹ️</span>
                {/if}
                <span class="message">{t.message}</span>
            </div>
            <button
                class="close"
                onclick={() => toast.remove(t.id)}
                aria-label="Close notification"
            >
                ✕
            </button>
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        pointer-events: none;
    }

    .toast {
        pointer-events: auto;
        min-width: 300px;
        max-width: 450px;
        padding: 1rem;
        border-radius: 12px;
        background: white;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        border: 1px solid #eee;
    }

    .toast.success {
        border-left: 4px solid #4caf50;
    }

    .toast.error {
        border-left: 4px solid #f44336;
    }

    .toast.info {
        border-left: 4px solid #2196f3;
    }

    .toast-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .icon {
        font-size: 1.25rem;
    }

    .message {
        font-size: 0.95rem;
        color: #333;
        font-weight: 500;
        line-height: 1.4;
    }

    .close {
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        padding: 4px;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
    }

    .close:hover {
        background: #f5f5f5;
        color: #666;
    }
</style>
