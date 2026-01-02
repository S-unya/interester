/**
 * Result notes storage operations using the configured storage adapter
 */

import type { ResultNote } from "../types";
import { getStorageAdapter } from "./adapter";

function getResultNotesKey(interestId: string): string {
	return `result-notes/${interestId}.json`;
}

export const ResultNotesStorage = {
	async getByInterestId(interestId: string): Promise<ResultNote[]> {
		const adapter = getStorageAdapter();
		const key = getResultNotesKey(interestId);
		const notes = await adapter.read<ResultNote[]>(key);
		return notes || [];
	},

	async getByResultId(
		interestId: string,
		resultId: string,
	): Promise<ResultNote[]> {
		const notes = await this.getByInterestId(interestId);
		return notes.filter((note) => note.resultId === resultId);
	},

	async saveAll(interestId: string, notes: ResultNote[]): Promise<void> {
		const adapter = getStorageAdapter();
		const key = getResultNotesKey(interestId);
		await adapter.write(key, notes);
	},

	async add(
		interestId: string,
		input: { resultId: string; body: string; pinned?: boolean },
	): Promise<ResultNote> {
		const existing = await this.getByInterestId(interestId);
		const now = new Date().toISOString();
		const note: ResultNote = {
			id: crypto.randomUUID(),
			interestId,
			resultId: input.resultId,
			body: input.body,
			pinned: input.pinned,
			createdAt: now,
		};

		const updated = [...existing, note];
		await this.saveAll(interestId, updated);
		return note;
	},

	async update(
		interestId: string,
		noteId: string,
		updates: Partial<Pick<ResultNote, "body" | "pinned">>,
	): Promise<ResultNote | null> {
		const existing = await this.getByInterestId(interestId);
		const index = existing.findIndex((note) => note.id === noteId);

		if (index === -1) return null;

		const now = new Date().toISOString();

		existing[index] = {
			...existing[index],
			...updates,
			updatedAt: now,
		};

		await this.saveAll(interestId, existing);
		return existing[index];
	},

	async delete(interestId: string, noteId: string): Promise<boolean> {
		const existing = await this.getByInterestId(interestId);
		const filtered = existing.filter((note) => note.id !== noteId);

		if (filtered.length === existing.length) return false;

		await this.saveAll(interestId, filtered);
		return true;
	},

	/**
	 * Delete all notes linked to a particular result.
	 * Useful when a result itself is being deleted.
	 */
	async deleteByResultId(
		interestId: string,
		resultId: string,
	): Promise<number> {
		const existing = await this.getByInterestId(interestId);
		const filtered = existing.filter((note) => note.resultId !== resultId);
		const removedCount = existing.length - filtered.length;

		if (removedCount === 0) return 0;

		await this.saveAll(interestId, filtered);
		return removedCount;
	},
};
