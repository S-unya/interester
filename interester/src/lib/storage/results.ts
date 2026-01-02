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

	/**
	 * Mark a single result as read and persist the change.
	 */
	async markAsRead(
		interestId: string,
		resultId: string,
	): Promise<FormattedResult | null> {
		const results = await this.getByInterestId(interestId);
		const index = results.findIndex((r) => r.id === resultId);
		if (index === -1) return null;

		const now = new Date().toISOString();
		results[index] = {
			...results[index],
			status: "read",
			readAt: now,
		};

		await this.save(interestId, results);
		return results[index];
	},

	/**
	 * Mark a single result as unread and persist the change.
	 */
	async markAsUnread(
		interestId: string,
		resultId: string,
	): Promise<FormattedResult | null> {
		const results = await this.getByInterestId(interestId);
		const index = results.findIndex((r) => r.id === resultId);
		if (index === -1) return null;

		results[index] = {
			...results[index],
			status: "unread",
			readAt: undefined,
		};

		await this.save(interestId, results);
		return results[index];
	},

	/**
	 * Archive a single result and persist the change.
	 */
	async archiveResult(
		interestId: string,
		resultId: string,
	): Promise<FormattedResult | null> {
		const results = await this.getByInterestId(interestId);
		const index = results.findIndex((r) => r.id === resultId);
		if (index === -1) return null;

		const now = new Date().toISOString();
		results[index] = {
			...results[index],
			status: "archived",
			archivedAt: now,
		};

		await this.save(interestId, results);
		return results[index];
	},

	/**
	 * Permanently delete a single result from storage.
	 */
	async deleteResult(interestId: string, resultId: string): Promise<boolean> {
		const results = await this.getByInterestId(interestId);
		const filtered = results.filter((r) => r.id !== resultId);
		if (filtered.length === results.length) return false;

		await this.save(interestId, filtered);
		return true;
	},

	/**
	 * Toggle the pinned status of a result.
	 */
	async togglePin(
		interestId: string,
		resultId: string,
	): Promise<FormattedResult | null> {
		const results = await this.getByInterestId(interestId);
		const index = results.findIndex((r) => r.id === resultId);
		if (index === -1) return null;

		results[index] = {
			...results[index],
			pinned: !results[index].pinned,
		};

		await this.save(interestId, results);
		return results[index];
	},
};
