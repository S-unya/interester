import { InterestStorage } from '$lib/storage';
import { sendSystemNotification } from '$lib/notifications';
import type { Interest } from '$lib/types';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour by default (can be overridden)

/**
 * Check if an interest is due for a scan.
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
 * Run checks for all interests.
 */
async function checkAndRunInterests() {
    console.log('[Scheduler] Checking for due interests...');
    try {
        // We use the storage directly. In browser, this uses the fetch adapter which goes to API.
        const interests = await InterestStorage.getAll();

        for (const interest of interests) {
            if (isInterestDue(interest)) {
                console.log(`[Scheduler] Interest "${interest.name}" is due. Triggering scan via API...`);
                try {
                    // Call the API endpoint to run the scan
                    const response = await fetch(`/api/interests/${interest.id}/run`, {
                        method: 'POST'
                    });

                    if (response.ok) {
                        const result = await response.json();

                        // We assume the API updates lastRanAt, but we can also rely on the next fetch to see it?
                        // Actually, if we want to update local state or just trust the API did it.
                        // The API should handle updating 'lastRanAt'.

                        // Notify
                        if (result.success) {
                            await sendSystemNotification(
                                'New Interest Summary',
                                `Found new content for: ${interest.name}`
                            );
                        }
                    } else {
                        console.error(`[Scheduler] API call failed for "${interest.name}":`, await response.text());
                    }

                } catch (err) {
                    console.error(`[Scheduler] Failed to trigger scan for "${interest.name}":`, err);
                }
            }
        }
    } catch (e) {
        console.error('[Scheduler] Failed to get interests:', e);
    }
}

/**
 * Start the scheduler loop.
 * Returns a cleanup function to stop the scheduler.
 */
export function startScheduler(intervalMs: number = CHECK_INTERVAL_MS): () => void {
    console.log('[Scheduler] Started.');

    // Run an initial check after 5 seconds to catch up on missed schedules
    const initialCheckId = setTimeout(() => {
        checkAndRunInterests();
    }, 5000);

    const intervalId = setInterval(checkAndRunInterests, intervalMs);

    return () => {
        clearTimeout(initialCheckId);
        clearInterval(intervalId);
        console.log('[Scheduler] Stopped.');
    };
}
