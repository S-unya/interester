/**
 * Generate a unique ID
 */
export function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Check if the application is running in a Tauri environment
 */
export function isTauri(): boolean {
    return (
        typeof window !== "undefined" &&
        ((window as any).__TAURI_INTERNALS__ !== undefined ||
            (window as any).__TAURI__ !== undefined ||
            (window as any).__TAURI_METADATA__ !== undefined)
    );
}
