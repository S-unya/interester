import { beforeEach, describe, expect, it } from "vitest";
import { configureStorage } from "$lib/storage/adapter";
import { PreferencesStorage } from "$lib/storage/preferences";
import { createMemoryAdapter } from "../../../test/memory-adapter";

describe("PreferencesStorage", () => {
	beforeEach(() => {
		configureStorage(createMemoryAdapter());
	});

	it("saves and retrieves lastActiveInterestId", async () => {
		const prefs = await PreferencesStorage.get();
		await PreferencesStorage.save({
			...prefs,
			lastActiveInterestId: "abc-123",
		});

		const retrieved = await PreferencesStorage.get();
		expect(retrieved.lastActiveInterestId).toBe("abc-123");
	});

	it("returns undefined for lastActiveInterestId when not set", async () => {
		const prefs = await PreferencesStorage.get();
		expect(prefs.lastActiveInterestId).toBeUndefined();
	});

	it("updating lastActiveInterestId does not clobber other preferences", async () => {
		const prefs = await PreferencesStorage.get();
		const original = { ...prefs };

		await PreferencesStorage.update({ lastActiveInterestId: "xyz-456" });

		const updated = await PreferencesStorage.get();
		expect(updated.lastActiveInterestId).toBe("xyz-456");
		expect(updated.enableNotifications).toBe(original.enableNotifications);
		expect(updated.maxResultsPerSearch).toBe(original.maxResultsPerSearch);
		expect(updated.defaultContentTypes).toEqual(original.defaultContentTypes);
	});
});
