import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.{test,spec}.{ts,js}"],
		alias: [
			// Force Svelte 5 to use the browser (client) entry in tests
			{
				find: /^svelte$/,
				replacement: resolve(
					__dirname,
					"node_modules/svelte/src/index-client.js",
				),
			},
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/lib/**/*.ts"],
			exclude: ["src/lib/**/*.d.ts"],
		},
	},
	resolve: {
		alias: {
			$lib: resolve(__dirname, "src/lib"),
			$app: resolve(__dirname, "src/app"),
		},
		conditions: ["browser"],
	},
});
