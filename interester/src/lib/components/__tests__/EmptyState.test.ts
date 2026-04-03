import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import EmptyState from "../EmptyState.svelte";

describe("EmptyState", () => {
	it("renders a description of what Interester does", () => {
		render(EmptyState, { props: { onopenSettings: vi.fn() } });

		// Should have a main heading and a lead paragraph explaining the purpose
		expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
		// The lead paragraph describes what the app does
		expect(
			screen.getByText(/searches the web|monitors topics|web on a schedule/i),
		).toBeInTheDocument();
	});

	it("renders a button that fires onopenSettings when clicked", async () => {
		const user = userEvent.setup();
		const onopenSettings = vi.fn();
		render(EmptyState, { props: { onopenSettings } });

		const btn = screen.getByRole("button", {
			name: /settings|configure|api key/i,
		});
		await user.click(btn);

		expect(onopenSettings).toHaveBeenCalledOnce();
	});

	it("describes what the user needs to configure", () => {
		render(EmptyState, { props: { onopenSettings: vi.fn() } });

		// Serper key for search and AI key for summarisation should be mentioned
		expect(screen.getAllByText(/serper/i).length).toBeGreaterThan(0);
		expect(
			screen.getAllByText(/ai|openai|gemini|anthropic/i).length,
		).toBeGreaterThan(0);
	});

	it("tells the user how to add their first interest after setup", () => {
		render(EmptyState, { props: { onopenSettings: vi.fn() } });

		expect(
			screen.getByText(/add.*(interest|\+)|(\+|interest).*add/i),
		).toBeInTheDocument();
	});
});
