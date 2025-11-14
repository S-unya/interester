/**
 * File-based storage utilities for JSON data persistence
 */

import type { FormattedResult, Interest, UserPreferences } from "./types";

// Storage paths - using Tauri's app data directory for native app
const DATA_DIR = "../data";
const INTERESTS_FILE = `${DATA_DIR}/interests.json`;
const RESULTS_DIR = `${DATA_DIR}/results`;
const PREFERENCES_FILE = `${DATA_DIR}/preferences.json`;

/**
 * Generic JSON file reader
 */
export async function readJsonFile<T>(
	filePath: string,
	defaultValue: T,
): Promise<T> {
	try {
		// In browser/dev, use fetch
		const response = await fetch(filePath);
		if (!response.ok) {
			return defaultValue;
		}
		return await response.json();
	} catch (error) {
		console.warn(`Could not read ${filePath}, using default:`, error);
		return defaultValue;
	}
}

/**
 * Generic JSON file writer
 * Note: In production with Tauri, this will need to use Tauri's fs API
 */
export async function writeJsonFile<T>(
	filePath: string,
	data: T,
): Promise<void> {
	// For now, this is a placeholder - actual implementation will depend on:
	// - Development: Node.js fs API via API routes
	// - Production: Tauri fs plugin

	// Temporary: log that we would write this
	console.log(`Would write to ${filePath}:`, data);
}

/**
 * Interest storage operations
 */
export const InterestStorage = {
	async getAll(): Promise<Interest[]> {
		return readJsonFile<Interest[]>(INTERESTS_FILE, []);
	},

	async getById(id: string): Promise<Interest | null> {
		const interests = await this.getAll();
		return interests.find((i) => i.id === id) || null;
	},

	async save(interests: Interest[]): Promise<void> {
		await writeJsonFile(INTERESTS_FILE, interests);
	},

	async create(
		interest: Omit<Interest, "id" | "createdAt" | "updatedAt">,
	): Promise<Interest> {
		const interests = await this.getAll();
		const newInterest: Interest = {
			...interest,
			id: crypto.randomUUID(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		interests.push(newInterest);
		await this.save(interests);
		return newInterest;
	},

	async update(
		id: string,
		updates: Partial<Interest>,
	): Promise<Interest | null> {
		const interests = await this.getAll();
		const index = interests.findIndex((i) => i.id === id);

		if (index === -1) return null;

		interests[index] = {
			...interests[index],
			...updates,
			id, // Ensure ID doesn't change
			updatedAt: new Date().toISOString(),
		};

		await this.save(interests);
		return interests[index];
	},

	async delete(id: string): Promise<boolean> {
		const interests = await this.getAll();
		const filtered = interests.filter((i) => i.id !== id);

		if (filtered.length === interests.length) return false;

		await this.save(filtered);
		return true;
	},
};

/**
 * Search results storage operations
 */
export const ResultStorage = {
	async getByInterestId(interestId: string): Promise<FormattedResult[]> {
		const filePath = `${RESULTS_DIR}/${interestId}.json`;
		return readJsonFile<FormattedResult[]>(filePath, []);
	},

	async save(interestId: string, results: FormattedResult[]): Promise<void> {
		const filePath = `${RESULTS_DIR}/${interestId}.json`;
		await writeJsonFile(filePath, results);
	},
};

/**
 * User preferences storage
 */
export const PreferencesStorage = {
	async get(): Promise<UserPreferences> {
		return readJsonFile<UserPreferences>(PREFERENCES_FILE, {
			defaultContentTypes: ["news", "articles"],
			maxResultsPerSearch: 10,
			enableNotifications: false,
		});
	},

	async save(preferences: UserPreferences): Promise<void> {
		await writeJsonFile(PREFERENCES_FILE, preferences);
	},
};
