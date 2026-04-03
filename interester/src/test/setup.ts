import "@testing-library/jest-dom";
import { afterEach } from "vitest";

// bits-ui Dialog (and other portalled primitives) apply scroll-lock styles
// directly to document.body and render portal elements as siblings outside the
// @testing-library/svelte cleanup container. Without this hook, those styles
// and DOM nodes leak between tests, breaking pointer-events for subsequent tests.
afterEach(() => {
	// Remove scroll-lock styles applied by bits-ui / body-lock
	document.body.style.removeProperty("overflow");
	document.body.style.removeProperty("pointer-events");
	document.body.style.removeProperty("padding-right");
	document.body.removeAttribute("data-scroll-locked");

	// Remove portal elements that bits-ui renders directly on body
	document.querySelectorAll("[data-portal]").forEach((el) => {
		el.remove();
	});
	// Note: FocusScopeManager singleton reset is not done here — setupFiles run
	// in a separate module context from the Vite test graph, so any import of
	// bits-ui internals would be a different instance with no effect.
	// Instead, all bits-ui Dialog.Content components in this project use
	// onOpenAutoFocus={(e) => e.preventDefault()} to suppress the rAF focus-steal.
});
