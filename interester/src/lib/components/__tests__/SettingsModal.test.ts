import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the storage boundaries
vi.mock("$lib/secret-storage", () => ({
	SecretStorage: {
		getSecret: vi.fn().mockResolvedValue(null),
		setSecret: vi.fn().mockResolvedValue(undefined),
		deleteSecret: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock("$lib/storage/preferences", () => ({
	PreferencesStorage: {
		get: vi.fn().mockResolvedValue({
			defaultContentTypes: ["news", "articles"],
			maxResultsPerSearch: 10,
			enableNotifications: false,
			aiProvider: "google",
			aiModel: "gemini-1.5-flash",
			aiConfigured: false,
		}),
		save: vi.fn().mockResolvedValue(undefined),
		update: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock("$lib/stores/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { SecretStorage } = await import("$lib/secret-storage");
const { PreferencesStorage } = await import("$lib/storage/preferences");

import SettingsModal from "../SettingsModal.svelte";

describe("SettingsModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(PreferencesStorage.get as ReturnType<typeof vi.fn>).mockResolvedValue({
			defaultContentTypes: ["news", "articles"],
			maxResultsPerSearch: 10,
			enableNotifications: false,
			aiProvider: "google",
			aiModel: "gemini-1.5-flash",
			aiConfigured: false,
		});
		(SecretStorage.getSecret as ReturnType<typeof vi.fn>).mockResolvedValue(
			null,
		);
	});

	it("calls SecretStorage.setSecret for each key field with a value on save", async () => {
		const user = userEvent.setup();
		render(SettingsModal, { props: { open: true, missingKeys: false } });

		// Wait for the modal to load existing values
		await waitFor(() => screen.getByLabelText(/serper api key/i));

		const serperInput = screen.getByLabelText(/serper api key/i);
		const aiKeyInput = screen.getByLabelText(/ai api key/i);

		await user.clear(serperInput);
		await user.type(serperInput, "my-serper-key");
		await user.clear(aiKeyInput);
		await user.type(aiKeyInput, "my-ai-key");

		await user.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(SecretStorage.setSecret).toHaveBeenCalledWith(
				"serper_api_key",
				"my-serper-key",
			);
			expect(SecretStorage.setSecret).toHaveBeenCalledWith(
				"ai_api_key",
				"my-ai-key",
			);
		});
	});

	it("calls PreferencesStorage.save with non-secret prefs on save", async () => {
		const user = userEvent.setup();
		render(SettingsModal, { props: { open: true, missingKeys: false } });

		await waitFor(() => screen.getByLabelText(/serper api key/i));

		await user.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(PreferencesStorage.save).toHaveBeenCalledWith(
				expect.objectContaining({
					aiProvider: expect.any(String),
					aiConfigured: expect.any(Boolean),
				}),
			);
			// Must NOT include secrets
			expect(PreferencesStorage.save).not.toHaveBeenCalledWith(
				expect.objectContaining({ serperApiKey: expect.anything() }),
			);
			expect(PreferencesStorage.save).not.toHaveBeenCalledWith(
				expect.objectContaining({ aiApiKey: expect.anything() }),
			);
		});
	});

	it("shows missing-keys banner when missingKeys prop is true", async () => {
		render(SettingsModal, { props: { open: true, missingKeys: true } });

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
	});

	it("does not show missing-keys banner when missingKeys prop is false", async () => {
		render(SettingsModal, { props: { open: true, missingKeys: false } });

		await waitFor(() => screen.getByLabelText(/serper api key/i));

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});
