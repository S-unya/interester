import type { DiscreteItem } from "$lib/types";

/**
 * Generate a minimal iCalendar (.ics) string from a DiscreteItem of type "event".
 * Pure function — no side effects. The caller is responsible for triggering the download.
 */
export function generateIcs(item: DiscreteItem): string {
	const dtStamp = formatDate(new Date());
	const dtStart = parseDateToIcs(item.date);

	const uid = `${item.id}@interester`;

	const lines: string[] = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Interester//EN",
		"BEGIN:VEVENT",
		`UID:${uid}`,
		`DTSTAMP;VALUE=DATE:${dtStamp}`,
		`DTSTART;VALUE=DATE:${dtStart}`,
		`SUMMARY:${escapeIcsText(item.title)}`,
		`DESCRIPTION:${escapeIcsText(item.summary)}`,
	];

	if (item.location) {
		lines.push(`LOCATION:${escapeIcsText(item.location)}`);
	}

	if (item.url) {
		lines.push(`URL:${item.url}`);
	}

	lines.push("END:VEVENT", "END:VCALENDAR");

	return lines.join("\r\n");
}

function formatDate(date: Date): string {
	return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function parseDateToIcs(dateStr: string | undefined): string {
	if (!dateStr) return formatDate(new Date());
	const parsed = new Date(dateStr);
	if (isNaN(parsed.getTime())) return formatDate(new Date());
	return formatDate(parsed);
}

function escapeIcsText(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\n/g, "\\n");
}
