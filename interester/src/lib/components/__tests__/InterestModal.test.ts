import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Interest } from "$lib/types";

// Mock InterestStorage as a test boundary
vi.mock("$lib/storage/interests", () => ({
	InterestStorage: {
		create: vi.fn().mockResolvedValue({
			id: "new-id",
			name: "Test Interest",
			searchTerms: ["term1"],
			active: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}),
		update: vi.fn().mockResolvedValue(null),
	},
}));

vi.mock("$lib/stores/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { InterestStorage } = await import("$lib/storage/interests");

import InterestModal from "../InterestModal.svelte";

const BASE_INTEREST: Interest = {
	id: "existing-id",
	name: "Existing Interest",
	searchTerms: ["existing term"],
	active: true,
	createdAt: "2024-01-01T00:00:00.000Z",
	updatedAt: "2024-01-01T00:00:00.000Z",
	scheduleFrequency: "daily",
	description: "A description",
};

describe("InterestModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows a validation error when submitted without a name", async () => {
		const user = userEvent.setup();
		render(InterestModal, { props: { open: true } });

		// Clear name field and submit
		const nameInput = screen.getByLabelText(/name/i);
		await user.clear(nameInput);
		await user.click(screen.getByRole("button", { name: /save|create/i }));

		await waitFor(() => {
			expect(screen.getByText(/name is required/i)).toBeInTheDocument();
		});

		expect(InterestStorage.create).not.toHaveBeenCalled();
	});

	it("shows a validation error when submitted without search terms", async () => {
		const user = userEvent.setup();
		render(InterestModal, { props: { open: true } });

		// Fill name but leave search terms empty
		const nameInput = screen.getByLabelText(/name/i);
		await user.clear(nameInput);
		await user.type(nameInput, "My Interest");

		await user.click(screen.getByRole("button", { name: /save|create/i }));

		await waitFor(() => {
			expect(screen.getByText(/at least one search term/i)).toBeInTheDocument();
		});

		expect(InterestStorage.create).not.toHaveBeenCalled();
	});

	it("calls InterestStorage.create with correct shape on valid add submission", async () => {
		const user = userEvent.setup();
		render(InterestModal, { props: { open: true } });

		const nameInput = screen.getByLabelText(/name/i);
		await user.clear(nameInput);
		await user.type(nameInput, "AI News");

		// Add a search term
		const termInput = screen.getByPlaceholderText(/add a search term/i);
		await user.type(termInput, "artificial intelligence");
		await user.keyboard("{Enter}");

		await user.click(screen.getByRole("button", { name: /save|create/i }));

		await waitFor(() => {
			expect(InterestStorage.create).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "AI News",
					searchTerms: expect.arrayContaining(["artificial intelligence"]),
					active: true,
				}),
			);
		});
	});

	it("calls InterestStorage.update with correct shape on valid edit submission", async () => {
		const user = userEvent.setup();
		render(InterestModal, { props: { open: true, interest: BASE_INTEREST } });

		// Change the name
		const nameInput = screen.getByLabelText(/name/i);
		await user.clear(nameInput);
		await user.type(nameInput, "Updated Name");

		await user.click(screen.getByRole("button", { name: /save|update/i }));

		await waitFor(() => {
			expect(InterestStorage.update).toHaveBeenCalledWith(
				BASE_INTEREST.id,
				expect.objectContaining({
					name: "Updated Name",
					searchTerms: expect.arrayContaining(["existing term"]),
				}),
			);
		});
	});

	it("hides content type select by default and shows it in advanced section", async () => {
		const user = userEvent.setup();
		render(InterestModal, { props: { open: true } });

		// Should not be visible before advanced toggle
		expect(screen.queryByLabelText(/content type/i)).not.toBeInTheDocument();

		// Open advanced
		await user.click(screen.getByRole("button", { name: /show advanced/i }));

		await waitFor(() => {
			expect(screen.getByLabelText(/content type/i)).toBeInTheDocument();
		});
	});

	it("includes contentType in the create payload (defaults to general)", async () => {
		const user = userEvent.setup();
		render(InterestModal, { props: { open: true } });

		const nameInput = screen.getByLabelText(/name/i);
		await user.clear(nameInput);
		await user.type(nameInput, "AI News");

		const termInput = screen.getByPlaceholderText(/add a search term/i);
		await user.type(termInput, "ai");
		await user.keyboard("{Enter}");

		await user.click(screen.getByRole("button", { name: /save|create/i }));

		await waitFor(() => {
			expect(InterestStorage.create).toHaveBeenCalledWith(
				expect.objectContaining({ contentType: "general" }),
			);
		});
	});

	it("pre-selects the existing contentType when editing", async () => {
		const user = userEvent.setup();
		render(InterestModal, {
			props: {
				open: true,
				interest: { ...BASE_INTEREST, contentType: "events" },
			},
		});

		// Open advanced section
		await user.click(screen.getByRole("button", { name: /show advanced/i }));

		await waitFor(() => {
			const select = screen.getByLabelText(
				/content type/i,
			) as HTMLSelectElement;
			expect(select.value).toBe("events");
		});
	});

	it("hides advanced section by default and shows it after toggle", async () => {
		const user = userEvent.setup();
		render(InterestModal, { props: { open: true } });

		// Advanced section should not be visible
		expect(
			screen.queryByLabelText(/schedule frequency/i),
		).not.toBeInTheDocument();

		// Click "Show advanced options"
		const toggle = screen.getByRole("button", { name: /show advanced/i });
		await user.click(toggle);

		await waitFor(() => {
			expect(screen.getByLabelText(/schedule frequency/i)).toBeInTheDocument();
		});
	});
});
