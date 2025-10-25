import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	server: {
		allowedHosts: [
			"localhost",
			"127.0.0.1",
			"8rzoad-ip-161-132-54-35.tunnelmole.net",
			".tunnelmole.net",
		],
		host: "::",
		port: 8080,
		proxy: {
			'/train-model': {
				target: 'http://localhost:5050',
				changeOrigin: true,
			},
			'/predictions': {
				target: 'http://localhost:5050',
				changeOrigin: true,
			},
			'/predict': {
				target: 'http://localhost:5050',
				changeOrigin: true,
			},
			'/save-model': {
				target: 'http://localhost:5050',
				changeOrigin: true,
			},
		},
	},
	plugins: [react(), mode === "development" && componentTagger()].filter(
		Boolean,
	),
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
}));
