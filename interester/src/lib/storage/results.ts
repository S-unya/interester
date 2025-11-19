/**
 * Search results storage operations using the configured storage adapter
 */

import type { FormattedResult } from "../types";
import { getStorageAdapter } from "./adapter";

export const ResultStorage = {
	async getByInterestId(interestId: string): Promise<FormattedResult[]> {
		const adapter = getStorageAdapter();
		const key = `results/${interestId}.json`;
		const results = await adapter.read<FormattedResult[]>(key);
		return results || [];
	},

	async save(interestId: string, results: FormattedResult[]): Promise<void> {
		const adapter = getStorageAdapter();
		const key = `results/${interestId}.json`;
		await adapter.write(key, results);
	},

	async delete(interestId: string): Promise<void> {
		const adapter = getStorageAdapter();
		const key = `results/${interestId}.json`;
		await adapter.delete(key);
	},

	async listAll(): Promise<string[]> {
		const adapter = getStorageAdapter();
		const keys = await adapter.list("results/");
		return keys.map((key) => key.replace("results/", "").replace(".json", ""));
	},
};
