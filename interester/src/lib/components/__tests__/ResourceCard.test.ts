import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { DiscreteItem } from "$lib/types";

import ResourceCard from "../ResourceCard.svelte";

const RESOURCE_ITEM: DiscreteItem = {
	id: "res-1",
	type: "resource",
	title: "Svelte 5 Migration Guide",
	summary: "Step-by-step guide for migrating from Svelte 4 to Svelte 5.",
	url: "https://svelte.dev/docs/v5-migration-guide",
	source: "Svelte Docs",
};

describe("ResourceCard", () => {
	it("renders the resource title as a link to the url", () => {
		render(ResourceCard, { props: { item: RESOURCE_ITEM } });
		const link = screen.getByRole("link", { name: "Svelte 5 Migration Guide" });
		expect(link).toHaveAttribute(
			"href",
			"https://svelte.dev/docs/v5-migration-guide",
		);
		expect(link).toHaveAttribute("target", "_blank");
	});

	it("renders the summary", () => {
		render(ResourceCard, { props: { item: RESOURCE_ITEM } });
		expect(
			screen.getByText(
				"Step-by-step guide for migrating from Svelte 4 to Svelte 5.",
			),
		).toBeInTheDocument();
	});

	it("renders the source name", () => {
		render(ResourceCard, { props: { item: RESOURCE_ITEM } });
		expect(screen.getByText(/Svelte Docs/)).toBeInTheDocument();
	});
});
