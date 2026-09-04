/**
 * Copyright 2018-2024 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */
import { buildReact, copyFiles, deleteFoldersRecursive, npmInstall } from "@iobroker/build-tools";

const __dirname = import.meta.dirname;
const srcAdmin = `${__dirname}/src-admin/`;

function clean() {
	deleteFoldersRecursive(`${__dirname}/admin/custom`);
	deleteFoldersRecursive(`${__dirname}/src-admin/build`);
}

// `mf-manifest.json` is copied on purpose: admin 8 fetches it next to the remote entry to decide
// from the shared modules which GUI API generation this component was built against.
function copy() {
	copyFiles(["src-admin/build/**/*", "!src-admin/build/index.html"], "admin/custom/");
	copyFiles(["src-admin/src/i18n/*.json"], "admin/custom/i18n");
}

if (process.argv.find(arg => arg === "--0-clean")) {
	clean();
} else if (process.argv.find(arg => arg === "--1-npm")) {
	npmInstall(srcAdmin, { clean: true, force: false }).catch(e =>
		console.error(`Cannot install packages: ${e.toString()}`),
	);
} else if (process.argv.find(arg => arg === "--2-compile")) {
	buildReact(srcAdmin, { rootDir: srcAdmin, vite: true }).catch(e =>
		console.error(`Cannot build React: ${e.toString()}`),
	);
} else if (process.argv.find(arg => arg === "--3-copy")) {
	copy();
} else if (process.argv.includes("--default")) {
	clean();
	npmInstall(srcAdmin, { clean: true, force: false })
		.then(() => buildReact(srcAdmin, { rootDir: srcAdmin, vite: true }))
		.then(() => copy())
		.catch(e => {
			console.error(e);
			process.exit(2);
		});
}
