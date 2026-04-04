import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Tauri invoke boundary — this is the only external system boundary
// SecretStorage wraps. We do NOT mock SecretStorage itself.
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
	invoke: mockInvoke,
}));

// Import after mock is set up
const { SecretStorage } = await import("../secret-storage");

describe("SecretStorage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		SecretStorage.clearCache();
	});

	it("returns the value that was stored", async () => {
		mockInvoke.mockImplementation(
			(cmd: string, args?: Record<string, unknown>) => {
				if (cmd === "set_secret") return Promise.resolve();
				if (cmd === "get_secret") return Promise.resolve("my-api-key");
				return Promise.reject(new Error(`Unexpected command: ${cmd}`));
			},
		);

		await SecretStorage.setSecret("serper_api_key", "my-api-key");
		const result = await SecretStorage.getSecret("serper_api_key");

		expect(result).toBe("my-api-key");
	});

	it("returns null when the key does not exist", async () => {
		mockInvoke.mockImplementation((cmd: string) => {
			if (cmd === "get_secret") return Promise.resolve(null);
			return Promise.reject(new Error(`Unexpected command: ${cmd}`));
		});

		const result = await SecretStorage.getSecret("nonexistent_key");

		expect(result).toBeNull();
	});

	it("returns null after deleting a key", async () => {
		mockInvoke.mockImplementation((cmd: string) => {
			if (cmd === "delete_secret") return Promise.resolve();
			if (cmd === "get_secret") return Promise.resolve(null);
			return Promise.reject(new Error(`Unexpected command: ${cmd}`));
		});

		await SecretStorage.deleteSecret("serper_api_key");
		const result = await SecretStorage.getSecret("serper_api_key");

		expect(result).toBeNull();
	});

	it("rejects when the keychain command fails", async () => {
		mockInvoke.mockImplementation((cmd: string) => {
			if (cmd === "get_secret")
				return Promise.reject(new Error("Keychain access denied"));
			return Promise.reject(new Error(`Unexpected command: ${cmd}`));
		});

		await expect(SecretStorage.getSecret("serper_api_key")).rejects.toThrow(
			"Keychain access denied",
		);
	});

	it("returns cached value on second getSecret call without hitting keychain again", async () => {
		mockInvoke.mockResolvedValue("cached-key");

		await SecretStorage.getSecret("ai_api_key");
		await SecretStorage.getSecret("ai_api_key");

		expect(mockInvoke).toHaveBeenCalledTimes(1);
	});

	it("invalidates cache when setSecret is called, re-reads on next getSecret", async () => {
		mockInvoke.mockResolvedValueOnce("old-key"); // first get
		// setSecret call
		mockInvoke.mockResolvedValueOnce(undefined);
		mockInvoke.mockResolvedValueOnce("new-key"); // get after invalidation

		await SecretStorage.getSecret("ai_api_key");
		await SecretStorage.setSecret("ai_api_key", "new-key");
		const result = await SecretStorage.getSecret("ai_api_key");

		expect(result).toBe("new-key");
		expect(mockInvoke).toHaveBeenCalledTimes(3);
	});

	it("invalidates cache when deleteSecret is called", async () => {
		mockInvoke.mockResolvedValueOnce("existing-key"); // first get
		mockInvoke.mockResolvedValueOnce(undefined); // delete
		mockInvoke.mockResolvedValueOnce(null); // get after delete

		await SecretStorage.getSecret("ai_api_key");
		await SecretStorage.deleteSecret("ai_api_key");
		const result = await SecretStorage.getSecret("ai_api_key");

		expect(result).toBeNull();
		expect(mockInvoke).toHaveBeenCalledTimes(3);
	});
});
