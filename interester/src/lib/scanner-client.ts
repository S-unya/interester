import type { FormattedResult, Interest, ApiResponse } from "./types";
import { isTauri } from "./utils";

export const ScannerClient = {
    /**
     * Perform a scan for the given interest, using the appropriate backend for the environment.
     */
    async performScan(interest: Interest): Promise<FormattedResult> {
        if (isTauri()) {
            console.log("[ScannerClient] Running scan via Tauri Command...");
            try {
                const { invoke } = await import("@tauri-apps/api/core");
                const result = await invoke<FormattedResult>("run_search_scan", {
                    interest
                });
                return result;
            } catch (err) {
                console.error("[ScannerClient] Tauri scan failed:", err);
                throw err;
            }
        } else {
            console.log("[ScannerClient] Running scan via SvelteKit API...");
            try {
                const response = await fetch(`/api/interests/${interest.id}/run`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(interest),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("[ScannerClient] SvelteKit API scan failed status:", response.status, errorText);
                    throw new Error(`API scan failed: ${response.status} ${errorText}`);
                }

                const result: ApiResponse<FormattedResult> = await response.json();
                if (!result.success || !result.data) {
                    console.error("[ScannerClient] SvelteKit API scan failed success:false", result.error);
                    throw new Error(result.error || "Failed to run scan via API");
                }

                return result.data;
            } catch (err) {
                console.error("[ScannerClient] API scan failed:", err);
                throw err;
            }
        }
    }
};
