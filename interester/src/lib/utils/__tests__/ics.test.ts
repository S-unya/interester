import { describe, expect, it } from "vitest";
import type { DiscreteItem } from "$lib/types";
import { generateIcs } from "../ics";

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

describe("generateIcs", () => {
	it("produces a valid iCalendar string for a full event item", () => {
		const ics = generateIcs(EVENT_ITEM);

		expect(ics).toContain("BEGIN:VCALENDAR");
		expect(ics).toContain("END:VCALENDAR");
		expect(ics).toContain("BEGIN:VEVENT");
		expect(ics).toContain("END:VEVENT");
		expect(ics).toContain("DTSTART");
		expect(ics).toContain("SUMMARY:SvelteConf 2025");
		expect(ics).toContain("LOCATION:San Francisco\\, CA");
		expect(ics).toContain("URL:https://svelteconf.com");
	});

	it("omits LOCATION when item has no location", () => {
		const item: DiscreteItem = { ...EVENT_ITEM, location: undefined };
		const ics = generateIcs(item);

		expect(ics).not.toContain("LOCATION");
	});

	it("omits URL when item has no url", () => {
		const item: DiscreteItem = { ...EVENT_ITEM, url: "" };
		const ics = generateIcs(item);

		expect(ics).not.toContain("URL:");
	});

	it("does not throw and uses today's date when date is unparseable", () => {
		const item: DiscreteItem = { ...EVENT_ITEM, date: "not-a-date" };
		const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

		expect(() => generateIcs(item)).not.toThrow();
		const ics = generateIcs(item);
		expect(ics).toContain(`DTSTART;VALUE=DATE:${today}`);
	});
});
