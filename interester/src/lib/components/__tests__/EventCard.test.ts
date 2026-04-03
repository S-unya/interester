import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { DiscreteItem } from "$lib/types";

import EventCard from "../EventCard.svelte";

const EVENT_ITEM: DiscreteItem = {
	id: "evt-1",
	type: "event",
	title: "SvelteConf 2025",
	summary: "The annual Svelte community conference.",
	url: "https://svelteconf.com",
	date: "2025-09-15",
	location: "San Francisco, CA",
	source: "SvelteConf",
};

describe("EventCard", () => {
	it("renders the event title", () => {
		render(EventCard, { props: { item: EVENT_ITEM } });
		expect(screen.getByText("SvelteConf 2025")).toBeInTheDocument();
	});

	it("renders the event date", () => {
		render(EventCard, { props: { item: EVENT_ITEM } });
		expect(screen.getByText(/2025-09-15/)).toBeInTheDocument();
	});

	it("renders the event location", () => {
		render(EventCard, { props: { item: EVENT_ITEM } });
		expect(screen.getByText(/San Francisco/)).toBeInTheDocument();
	});

	it("renders the event summary", () => {
		render(EventCard, { props: { item: EVENT_ITEM } });
		expect(
			screen.getByText("The annual Svelte community conference."),
		).toBeInTheDocument();
	});

	it("renders a source link to the event url", () => {
		render(EventCard, { props: { item: EVENT_ITEM } });
		const link = screen.getByRole("link", { name: /SvelteConf/ });
		expect(link).toHaveAttribute("href", "https://svelteconf.com");
	});

	it("renders an Add to calendar link with a data:text/calendar href", () => {
		render(EventCard, { props: { item: EVENT_ITEM } });
		const calLink = screen.getByRole("link", { name: /add to calendar/i });
		expect(calLink).toHaveAttribute("href");
		expect(calLink.getAttribute("href")).toMatch(/^data:text\/calendar/);
		expect(calLink).toHaveAttribute("download");
	});

	it("omits location when item has no location", () => {
		render(EventCard, {
			props: { item: { ...EVENT_ITEM, location: undefined } },
		});
		expect(screen.queryByText(/San Francisco/)).not.toBeInTheDocument();
	});
});
