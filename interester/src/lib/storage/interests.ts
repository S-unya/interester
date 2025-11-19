/**
 * Interest storage operations using the configured storage adapter
 */

import type { Interest } from "../types";
import { getStorageAdapter } from "./adapter";

const INTERESTS_KEY = "interests.json";

export const InterestStorage = {
	async getAll(): Promise<Interest[]> {
		const adapter = getStorageAdapter();
		const interests = await adapter.read<Interest[]>(INTERESTS_KEY);
		return interests || [];
	},

	async getById(id: string): Promise<Interest | null> {
		const interests = await this.getAll();
		return interests.find((i) => i.id === id) || null;
	},

	async save(interests: Interest[]): Promise<void> {
		const adapter = getStorageAdapter();
		await adapter.write(INTERESTS_KEY, interests);
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
