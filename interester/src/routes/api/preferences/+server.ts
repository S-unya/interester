import { PreferencesStorage, initializeStorage } from "$lib/storage";
import type { ApiResponse, UserPreferences } from "$lib/types";
import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
    try {
        await initializeStorage();
        const preferences = await PreferencesStorage.get();
        return json({
            success: true,
            data: preferences,
        } satisfies ApiResponse<UserPreferences>);
    } catch (error) {
        console.error("Failed to fetch preferences:", error);
        return json(
            {
                success: false,
                error: "Failed to fetch preferences",
            } satisfies ApiResponse<UserPreferences>,
            { status: 500 },
        );
    }
};

export const PUT: RequestHandler = async ({ request }) => {
    try {
        await initializeStorage();
        const body: Partial<UserPreferences> = await request.json();
        const updated = await PreferencesStorage.update(body);
        return json({
            success: true,
            data: updated,
        } satisfies ApiResponse<UserPreferences>);
    } catch (error) {
        console.error("Failed to update preferences:", error);
        return json(
            {
                success: false,
                error: "Failed to update preferences",
            } satisfies ApiResponse<UserPreferences>,
            { status: 500 },
        );
    }
};
