/**
 * User preferences storage operations using the configured storage adapter
 */

import type { UserPreferences } from "../types";
import { getStorageAdapter } from "./adapter";

const PREFERENCES_KEY = "preferences.json";

const DEFAULT_PREFERENCES: UserPreferences = {
	defaultContentTypes: ["news", "articles"],
	maxResultsPerSearch: 10,
	enableNotifications: false,
};

export const PreferencesStorage = {
	async get(): Promise<UserPreferences> {
		const adapter = getStorageAdapter();
		const preferences = await adapter.read<UserPreferences>(PREFERENCES_KEY);
		return preferences || DEFAULT_PREFERENCES;
	},

	async save(preferences: UserPreferences): Promise<void> {
		const adapter = getStorageAdapter();
		await adapter.write(PREFERENCES_KEY, preferences);
	},

	async update(updates: Partial<UserPreferences>): Promise<UserPreferences> {
		const current = await this.get();
		const updated = { ...current, ...updates };
		await this.save(updated);
		return updated;
	},

	async reset(): Promise<UserPreferences> {
		await this.save(DEFAULT_PREFERENCES);
		return DEFAULT_PREFERENCES;
	},
};
