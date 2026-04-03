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
});
