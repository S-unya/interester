import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { DiscreteItem } from "$lib/types";

import NewsCard from "../NewsCard.svelte";

const NEWS_ITEM: DiscreteItem = {
	id: "news-1",
	type: "news",
	title: "Svelte 5 Released",
	summary: "Svelte 5 introduces runes for reactive state.",
	url: "https://svelte.dev/blog/svelte-5",
	source: "Svelte Blog",
	imageUrl: "https://svelte.dev/og.png",
};

describe("NewsCard", () => {
	it("renders the news title", () => {
		render(NewsCard, { props: { item: NEWS_ITEM } });
		expect(screen.getByText("Svelte 5 Released")).toBeInTheDocument();
	});

	it("renders the summary", () => {
		render(NewsCard, { props: { item: NEWS_ITEM } });
		expect(
			screen.getByText("Svelte 5 introduces runes for reactive state."),
		).toBeInTheDocument();
	});

	it("renders a source link", () => {
		render(NewsCard, { props: { item: NEWS_ITEM } });
		const link = screen.getByRole("link", { name: /Svelte Blog/ });
		expect(link).toHaveAttribute("href", "https://svelte.dev/blog/svelte-5");
	});

	it("renders an image when imageUrl is present", () => {
		render(NewsCard, { props: { item: NEWS_ITEM } });
		const img = screen.getByRole("img", { name: "Svelte 5 Released" });
		expect(img).toHaveAttribute("src", "https://svelte.dev/og.png");
	});

	it("does not render an image when imageUrl is absent", () => {
		render(NewsCard, {
			props: { item: { ...NEWS_ITEM, imageUrl: undefined } },
		});
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});
});
