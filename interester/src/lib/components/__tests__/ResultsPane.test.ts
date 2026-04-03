import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormattedResult, Interest } from "$lib/types";

vi.mock("$lib/storage/results", () => ({
	ResultStorage: {
		getByInterestId: vi.fn().mockResolvedValue([]),
		save: vi.fn().mockResolvedValue(undefined),
		markAsRead: vi.fn().mockResolvedValue(null),
	},
}));

vi.mock("$lib/secret-storage", () => ({
	SecretStorage: {
		getSecret: vi.fn().mockResolvedValue("mock-key"),
	},
}));

vi.mock("$lib/scanner-client", () => ({
	ScannerClient: {
		performScan: vi.fn(),
	},
}));

vi.mock("$lib/stores/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { ResultStorage } = await import("$lib/storage/results");
const { SecretStorage } = await import("$lib/secret-storage");
const { ScannerClient } = await import("$lib/scanner-client");

import ResultsPane from "../ResultsPane.svelte";

const BASE_INTEREST: Interest = {
	id: "interest-1",
	name: "AI News",
	searchTerms: ["artificial intelligence"],
	active: true,
	createdAt: "2024-01-01T00:00:00.000Z",
	updatedAt: "2024-01-01T00:00:00.000Z",
};

function makeResult(id: string, generatedAt: string): FormattedResult {
	return {
		id,
		interestId: BASE_INTEREST.id,
		searchId: `search-${id}`,
		summary: `Summary for ${id}`,
		keyPoints: ["Key point 1"],
		sources: [{ title: "Source", url: "https://example.com" }],
		items: [],
		status: "unread",
		generatedAt,
	};
}

describe("ResultsPane", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(
			ResultStorage.getByInterestId as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);
		(SecretStorage.getSecret as ReturnType<typeof vi.fn>).mockResolvedValue(
			"mock-key",
		);
	});

	it("renders results for the active interest in chronological order", async () => {
		// Use dates within the default 30-day retention window
		const now = Date.now();
		const results = [
			makeResult("r1", new Date(now - 2 * 86400000).toISOString()),
			makeResult("r2", new Date(now - 1 * 86400000).toISOString()),
			makeResult("r3", new Date(now).toISOString()),
		];
		(
			ResultStorage.getByInterestId as ReturnType<typeof vi.fn>
		).mockResolvedValue(results);

		render(ResultsPane, {
			props: { interest: BASE_INTEREST, onopenSettings: vi.fn() },
		});

		await waitFor(() => {
			expect(screen.getByText("Summary for r1")).toBeInTheDocument();
			expect(screen.getByText("Summary for r2")).toBeInTheDocument();
			expect(screen.getByText("Summary for r3")).toBeInTheDocument();
		});

		// Chronological order: r1 before r2 before r3
		const items = screen.getAllByText(/Summary for r/);
		expect(items[0].textContent).toBe("Summary for r1");
		expect(items[2].textContent).toBe("Summary for r3");
	});

	it("renders a 'Run scan now' button", async () => {
		render(ResultsPane, {
			props: { interest: BASE_INTEREST, onopenSettings: vi.fn() },
		});

		expect(
			screen.getByRole("button", { name: /run scan/i }),
		).toBeInTheDocument();
	});

	it("calls ScannerClient.performScan and saves result when both keys are present", async () => {
		const user = userEvent.setup();
		const newResult = makeResult("r-new", "2024-01-04T10:00:00.000Z");
		(ScannerClient.performScan as ReturnType<typeof vi.fn>).mockResolvedValue(
			newResult,
		);

		render(ResultsPane, {
			props: { interest: BASE_INTEREST, onopenSettings: vi.fn() },
		});

		await user.click(screen.getByRole("button", { name: /run scan/i }));

		await waitFor(() => {
			expect(ScannerClient.performScan).toHaveBeenCalledWith(BASE_INTEREST);
			expect(ResultStorage.save).toHaveBeenCalled();
		});
	});

	it("emits onopenSettings with missingKeys when a key is absent and scan is attempted", async () => {
		const user = userEvent.setup();
		(SecretStorage.getSecret as ReturnType<typeof vi.fn>).mockResolvedValue(
			null,
		);
		const onopenSettings = vi.fn();

		render(ResultsPane, { props: { interest: BASE_INTEREST, onopenSettings } });

		await user.click(screen.getByRole("button", { name: /run scan/i }));

		await waitFor(() => {
			expect(onopenSettings).toHaveBeenCalledWith(true);
			expect(ScannerClient.performScan).not.toHaveBeenCalled();
		});
	});

	it("shows a scanning state on the button while scan is in progress", async () => {
		const user = userEvent.setup();
		// Never resolves during the test
		(ScannerClient.performScan as ReturnType<typeof vi.fn>).mockReturnValue(
			new Promise(() => {}),
		);

		render(ResultsPane, {
			props: { interest: BASE_INTEREST, onopenSettings: vi.fn() },
		});

		await user.click(screen.getByRole("button", { name: /run scan/i }));

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /scanning/i }),
			).toBeInTheDocument();
		});
	});

	it("shows a toast error when the scan fails", async () => {
		const user = userEvent.setup();
		const { toast } = await import("$lib/stores/toast");
		(ScannerClient.performScan as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("Scan failed"),
		);

		render(ResultsPane, {
			props: { interest: BASE_INTEREST, onopenSettings: vi.fn() },
		});

		await user.click(screen.getByRole("button", { name: /run scan/i }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled();
		});
	});

	it("renders EventCard for items with type 'event'", async () => {
		const result = makeResult("r1", new Date().toISOString());
		result.items = [
			{
				id: "item-1",
				type: "event",
				title: "Annual Gala",
				summary: "A big gala event",
				url: "https://example.com/gala",
				date: "2026-05-01T18:00:00.000Z",
			},
		];
		(
			ResultStorage.getByInterestId as ReturnType<typeof vi.fn>
		).mockResolvedValue([result]);

		render(ResultsPane, {
			props: { interest: BASE_INTEREST, onopenSettings: vi.fn() },
		});

		await waitFor(() => {
			expect(screen.getByText("Annual Gala")).toBeInTheDocument();
		});
	});

	it("renders NewsCard for items with type 'news'", async () => {
		const result = makeResult("r1", new Date().toISOString());
		result.items = [
			{
				id: "item-2",
				type: "news",
				title: "Breaking News Story",
				summary: "Something happened",
				url: "https://example.com/news",
			},
		];
		(
			ResultStorage.getByInterestId as ReturnType<typeof vi.fn>
		).mockResolvedValue([result]);

		render(ResultsPane, {
			props: { interest: BASE_INTEREST, onopenSettings: vi.fn() },
		});

		await waitFor(() => {
			expect(screen.getByText("Breaking News Story")).toBeInTheDocument();
		});
	});

	it("renders GeneralCard for items with an unrecognised type", async () => {
		const result = makeResult("r1", new Date().toISOString());
		result.items = [
			{
				id: "item-3",
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				type: "unknown-type" as any,
				title: "Unknown Type Item",
				summary: "Fallback content",
				url: "https://example.com/unknown",
			},
		];
		(
			ResultStorage.getByInterestId as ReturnType<typeof vi.fn>
		).mockResolvedValue([result]);

		render(ResultsPane, {
			props: { interest: BASE_INTEREST, onopenSettings: vi.fn() },
		});

		await waitFor(() => {
			expect(screen.getByText("Unknown Type Item")).toBeInTheDocument();
		});
	});

	it("hides results older than resultRetentionDays", async () => {
		const interestWithRetention: Interest = {
			...BASE_INTEREST,
			resultRetentionDays: 7,
		};
		const old = makeResult("r-old", "2020-01-01T00:00:00.000Z");
		const recent = makeResult("r-recent", new Date().toISOString());
		(
			ResultStorage.getByInterestId as ReturnType<typeof vi.fn>
		).mockResolvedValue([old, recent]);

		render(ResultsPane, {
			props: { interest: interestWithRetention, onopenSettings: vi.fn() },
		});

		await waitFor(() => {
			expect(screen.queryByText("Summary for r-old")).not.toBeInTheDocument();
			expect(screen.getByText("Summary for r-recent")).toBeInTheDocument();
		});
	});

	it("shows an unread indicator for results with status 'unread'", async () => {
		const result = makeResult("r1", new Date().toISOString());
		result.status = "unread";
		(
			ResultStorage.getByInterestId as ReturnType<typeof vi.fn>
		).mockResolvedValue([result]);

		render(ResultsPane, {
			props: { interest: BASE_INTEREST, onopenSettings: vi.fn() },
		});

		await waitFor(() => {
			expect(screen.getByLabelText(/unread/i)).toBeInTheDocument();
		});
	});

	it("calls ResultStorage.markAsRead and removes unread indicator on click", async () => {
		const user = userEvent.setup();
		const result = makeResult("r1", new Date().toISOString());
		result.status = "unread";
		(
			ResultStorage.getByInterestId as ReturnType<typeof vi.fn>
		).mockResolvedValue([result]);
		(ResultStorage.markAsRead as ReturnType<typeof vi.fn>).mockResolvedValue({
			...result,
			status: "read",
		});

		render(ResultsPane, {
			props: { interest: BASE_INTEREST, onopenSettings: vi.fn() },
		});

		// Wait for the unread indicator to appear then click the mark-as-read button
		await waitFor(() => {
			expect(screen.getByLabelText(/unread/i)).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: /mark as read/i }));

		await waitFor(() => {
			expect(ResultStorage.markAsRead).toHaveBeenCalledWith(
				BASE_INTEREST.id,
				result.id,
			);
			expect(screen.queryByLabelText(/unread/i)).not.toBeInTheDocument();
		});
	});
});
