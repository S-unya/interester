/**
 * Scheduler Web Worker
 * Periodically sends a tick message to the main thread to trigger interest checks.
 */

const DEFAULT_CHECK_INTERVAL = 60 * 1000; // 1 minute ticks for high precision checks in browser

let intervalId: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e) => {
    if (e.data.type === 'start') {
        const interval = e.data.interval || DEFAULT_CHECK_INTERVAL;
        console.log(`[Scheduler Worker] Started with interval: ${interval}ms`);

        if (intervalId) clearInterval(intervalId);

        intervalId = setInterval(() => {
            self.postMessage({ type: 'tick' });
        }, interval);
    } else if (e.data.type === 'stop') {
        console.log('[Scheduler Worker] Stopped.');
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
};
