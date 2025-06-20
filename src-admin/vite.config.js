import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { moduleFederationShared } from "@iobroker/adapter-react-v5/modulefederation.admin.config";
import { federation } from "@module-federation/vite";
import pack from "./package.json";

export default defineConfig(() => {
	return {
		build: { outDir: "build", target: "esnext" },
		plugins: [
			federation({
				manifest: true,
				name: "ConfigCustomKlf200Set",
				filename: "customComponents.js",
				exposes: { "./Components": "./src/Components.jsx" },
				remotes: {},
				shared: moduleFederationShared(pack),
			}),
			react(),
		],
		server: {
			port: 3000,
			proxy: {
				"/files": "http://localhost:8081",
				"/adapter": "http://localhost:8081",
				"/session": "http://localhost:8081",
				"/log": "http://localhost:8081",
				"/lib": "http://localhost:8081",
			},
		},
	};
});
