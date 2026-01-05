import { InterestStorage } from '$lib/storage';
import { sendSystemNotification } from '$lib/notifications';
import type { Interest } from '$lib/types';

// Environment Detection
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

/**
 * Check if an interest is due for a scan (used in browser/fallback mode).
 */
function isInterestDue(interest: Interest): boolean {
    if (!interest.active) return false;
    if (interest.scheduleFrequency === 'manual' || !interest.scheduleFrequency) return false;

    if (!interest.lastRanAt) return true;

    const lastRun = new Date(interest.lastRanAt).getTime();
    const now = Date.now();
    const hoursSinceLastRun = (now - lastRun) / (1000 * 60 * 60);

    switch (interest.scheduleFrequency) {
        case 'hourly':
            return hoursSinceLastRun >= 1;
        case 'daily':
            return hoursSinceLastRun >= 24;
        case 'weekly':
            return hoursSinceLastRun >= 168;
        default:
            return false;
    }
}

/**
 * Perform the scan for a specific interest.
 */
async function triggerScan(interestId: string) {
    try {
        console.log(`[Scheduler] Triggering scan via API for: ${interestId}`);
        const response = await fetch(`/api/interests/${interestId}/run`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // The API call usually handles notifications if they are also server-side, 
                // but let's check who sends notifications.
                // In the original scheduler, it was:
                // await sendSystemNotification('New Interest Summary', `Found new content for: ${interest.name}`);
                // Since triggerScan is called in the client, we can send notification here.

                // We need the interest name for the notification.
                // The result might contain it or we might need to fetch it.
                // For now, let's just use the result data if available.
                const interestName = result.data?.interestName || 'New Interest Content';
                await sendSystemNotification(
                    'New Interest Summary',
                    `Found new content for interest.`
                );
            }
        }
    } catch (err) {
        console.error(`[Scheduler] Failed to trigger scan for interest ${interestId}:`, err);
    }
}

/**
 * Check all interests and run those that are due.
 */
async function checkAndRunInterests() {
    console.log('[Scheduler] Manual check for due interests...');
    try {
        const interests = await InterestStorage.getAll();
        for (const interest of interests) {
            if (isInterestDue(interest)) {
                await triggerScan(interest.id);
            }
        }
    } catch (e) {
        console.error('[Scheduler] Failed to check interests:', e);
    }
}

/**
 * Start the scheduler.
 * In Tauri: Listens for Rust events.
 * In Browser: Uses Web Worker.
 */
export async function startScheduler(): Promise<() => void> {
    console.log(`[Scheduler] Starting (Environment: ${isTauri ? 'Tauri' : 'Browser'})`);

    let cleanup: () => void = () => { };

    if (isTauri) {
        try {
            const { listen } = await import('@tauri-apps/api/event');
            const unlisten = await listen<string>('scan-due', (event) => {
                const interestId = event.payload;
                console.log(`[Scheduler] Received scan-due from Rust for interest: ${interestId}`);
                triggerScan(interestId);
            });
            cleanup = () => {
                unlisten();
                console.log('[Scheduler] Tauri listener stopped.');
            };
        } catch (err) {
            console.error('[Scheduler] Failed to setup Tauri event listener:', err);
        }
    } else {
        // Fallback or non-Tauri browser context
        try {
            // Import worker using Vite's constructor syntax for better compatibility
            const SchedulerWorker = await import('./scheduler.worker.ts?worker');
            const worker = new SchedulerWorker.default();

            worker.onmessage = (e) => {
                if (e.data.type === 'tick') {
                    checkAndRunInterests();
                }
            };

            worker.postMessage({ type: 'start' });

            cleanup = () => {
                worker.postMessage({ type: 'stop' });
                worker.terminate();
                console.log('[Scheduler] Web Worker stopped.');
            };
        } catch (err) {
            console.warn('[Scheduler] Web Workers not supported or failed to load. Falling back to setInterval.', err);
            const interval = setInterval(checkAndRunInterests, 60 * 60 * 1000);
            cleanup = () => clearInterval(interval);
        }
    }

    // Run initial check after 5 seconds
    const initialCheck = setTimeout(checkAndRunInterests, 5000);

    return () => {
        clearTimeout(initialCheck);
        cleanup();
        console.log('[Scheduler] Stopped.');
    };
}
