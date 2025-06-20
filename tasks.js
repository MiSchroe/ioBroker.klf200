/**
 * Copyright 2018-2024 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */
import { copyFiles, deleteFoldersRecursive, npmInstall, buildReact } from "@iobroker/build-tools";

const __dirname = import.meta.dirname;
const srcAdmin = `${__dirname}/src-admin/`;

function clean() {
	deleteFoldersRecursive(`${__dirname}/admin/custom`);
	deleteFoldersRecursive(`${__dirname}/src-admin/build`);
}

function copy() {
	copyFiles(["src-admin/build/assets/*.js", "!src-admin/build/static/js/vendors*.js"], "admin/custom/assets");
	copyFiles(["src-admin/build/assets/*.map", "!src-admin/build/static/js/vendors*.map"], "admin/custom/assets");
	copyFiles(["src-admin/build/customComponents.js"], "admin/custom");
	copyFiles(["src-admin/build/customComponents.js.map"], "admin/custom");
	copyFiles(["src-admin/src/i18n/*.json"], "admin/custom/i18n");
}

if (process.argv.find(arg => arg === "--0-clean")) {
	clean();
} else if (process.argv.find(arg => arg === "--1-npm")) {
	npmInstall(srcAdmin);
} else if (process.argv.find(arg => arg === "--2-compile")) {
	buildReact(srcAdmin, { rootDir: srcAdmin, vite: true });
} else if (process.argv.find(arg => arg === "--3-copy")) {
	copy();
} else if (process.argv.includes("--default")) {
	clean();
	npmInstall(srcAdmin)
		.then(() => buildReact(srcAdmin, { rootDir: srcAdmin, vite: true }))
		.then(() => copy())
		.catch(e => {
			console.error(e);
			process.exit(2);
		});
}
