import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { DiscreteItem } from "$lib/types";

import GeneralCard from "../GeneralCard.svelte";

const GENERAL_ITEM: DiscreteItem = {
	id: "gen-1",
	type: "general",
	title: "Interesting Svelte Thread",
	summary: "A community discussion about Svelte component patterns.",
	url: "https://reddit.com/r/sveltejs/thread",
	source: "Reddit",
};

describe("GeneralCard", () => {
	it("renders the title", () => {
		render(GeneralCard, { props: { item: GENERAL_ITEM } });
		expect(screen.getByText("Interesting Svelte Thread")).toBeInTheDocument();
	});

	it("renders the summary", () => {
		render(GeneralCard, { props: { item: GENERAL_ITEM } });
		expect(
			screen.getByText(
				"A community discussion about Svelte component patterns.",
			),
		).toBeInTheDocument();
	});

	it("renders a link to the item url", () => {
		render(GeneralCard, { props: { item: GENERAL_ITEM } });
		const link = screen.getByRole("link", { name: /Reddit/ });
		expect(link).toHaveAttribute(
			"href",
			"https://reddit.com/r/sveltejs/thread",
		);
	});
});
