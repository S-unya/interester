/**
 * Core data structures for the Interester application
 */

export type ContentType =
	| "news"
	| "events"
	| "articles"
	| "discussions"
	| "general";

/**
 * Ignore rule used to hide or deprioritise certain results.
 *
 * These are typically attached to an Interest and interpreted when
 * running searches or displaying results.
 */
export interface IgnoreRule {
	id: string;
	label: string;
	reason?: string;
	pattern: {
		domains?: string[];
		urlSubstrings?: string[];
		titleIncludes?: string[];
		sourceIncludes?: string[];
	};
	scope?: "interest" | "global" | "model-suggested";
	active: boolean;
	createdAt: string;
	createdBy?: "user" | "system" | "model";
}

export interface Interest {
	id: string;
	name: string;
	description?: string;
	searchTerms: string[];
	monitorUrls?: string[];
	active: boolean;
	createdAt: string;
	updatedAt: string;
	// Phase 2 fields (for future use)
	scheduleFrequency?: "hourly" | "daily" | "weekly" | "manual";
	scheduleTime?: string; // HH:MM for daily/weekly
	lastRanAt?: string;

	// Result management
	ignoreRules?: IgnoreRule[];
	resultRetentionDays?: number;
}

export interface SearchResult {
	id: string;
	interestId: string;
	url: string;
	title: string;
	snippet: string;
	content?: string;
	source: string;
	publishedDate?: string;
	fetchedAt: string;
	relevanceScore?: number;
	contentType?: ContentType;
}

export interface FormattedResult {
	id: string;
	interestId: string;
	searchId: string;
	formattedHtml: string;
	formattedText: string;
	summary: string;
	keyPoints: string[];
	sources: {
		title: string;
		url: string;
		date?: string;
	}[];
	generatedAt: string;

	// Lifecycle and ignore metadata (optional for backwards compatibility)
	status?: "unread" | "read" | "archived";
	readAt?: string;
	archivedAt?: string;
	ignored?: boolean;
	ignoredAt?: string;
	ignoredReason?: string;
	ignoredByRuleId?: string;
	pinned?: boolean;
	items?: DiscreteItem[];
}

export type ItemType = "news" | "event" | "resource" | "opinion" | "general";

export interface DiscreteItem {
	id: string;
	type: ItemType;
	title: string;
	summary: string;
	url: string;
	date?: string; // ISO string or human readable
	location?: string; // For events
	source?: string;
}

export interface SearchExecution {
	id: string;
	interestId: string;
	status: "pending" | "running" | "completed" | "failed";
	startedAt: string;
	completedAt?: string;
	resultCount: number;
	error?: string;
}

export interface UserPreferences {
	notificationEmail?: string;
	notificationFrequency?:
	| "immediate"
	| "daily"
	| "weekly"
	| "monthly"
	| "yearly";
	defaultContentTypes: ContentType[];
	maxResultsPerSearch: number;
	enableNotifications: boolean;

	// Optional default retention for results, in days
	defaultResultRetentionDays?: number;

	globalIgnoreRules?: IgnoreRule[];
}

/**
 * User-authored note attached to a formatted result.
 * Notes are stored in separate JSON files keyed by interest.
 */
export interface ResultNote {
	id: string;
	interestId: string;
	resultId: string;
	body: string;
	pinned?: boolean;
	createdAt: string;
	updatedAt?: string;
}

// API Response types
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface InterestCreateInput {
	name: string;
	description?: string;
	searchTerms: string[];
	monitorUrls?: string[];
	scheduleFrequency?: "hourly" | "daily" | "weekly" | "manual";
	scheduleTime?: string;
}

export interface InterestUpdateInput extends Partial<InterestCreateInput> {
	active?: boolean;
	ignoreRules?: IgnoreRule[];
}
