import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { DiscreteItem } from "$lib/types";

import OpinionCard from "../OpinionCard.svelte";

const OPINION_ITEM: DiscreteItem = {
	id: "op-1",
	type: "opinion",
	title: "Why Svelte 5 Runes Are a Game Changer",
	summary:
		"An op-ed arguing that runes fundamentally improve developer ergonomics.",
	url: "https://dev.to/author/svelte-5-runes",
	source: "dev.to",
};

describe("OpinionCard", () => {
	it("renders the title", () => {
		render(OpinionCard, { props: { item: OPINION_ITEM } });
		expect(
			screen.getByText("Why Svelte 5 Runes Are a Game Changer"),
		).toBeInTheDocument();
	});

	it("renders the summary", () => {
		render(OpinionCard, { props: { item: OPINION_ITEM } });
		expect(
			screen.getByText(
				"An op-ed arguing that runes fundamentally improve developer ergonomics.",
			),
		).toBeInTheDocument();
	});

	it("renders the source name with a link", () => {
		render(OpinionCard, { props: { item: OPINION_ITEM } });
		const link = screen.getByRole("link", { name: /dev\.to/ });
		expect(link).toHaveAttribute(
			"href",
			"https://dev.to/author/svelte-5-runes",
		);
	});
});
