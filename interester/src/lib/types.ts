/**
 * Core data structures for the Interester application
 */

export type ContentType =
	| "news"
	| "events"
	| "articles"
	| "discussions"
	| "general";

export interface Interest {
	id: string;
	name: string;
	description?: string;
	searchTerms: string[];
	monitorUrls?: string[];
	contentTypes: ContentType[];
	active: boolean;
	createdAt: string;
	updatedAt: string;
	// Phase 2 fields (for future use)
	scheduleFrequency?: "hourly" | "daily" | "weekly" | "manual";
	scheduleTime?: string;
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
	contentTypes: ContentType[];
}

export interface InterestUpdateInput extends Partial<InterestCreateInput> {
	active?: boolean;
}
