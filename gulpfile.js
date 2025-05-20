import { task, src as _src, dest, series } from "gulp";
import { existsSync, readdirSync, statSync, rmdirSync, unlinkSync, readFileSync, writeFileSync } from "node:fs";
import { exec as _exec, fork } from "node:child_process";
import { fileURLToPath } from "url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
const src = `${__dirname}/src-admin/`;

function deleteFoldersRecursive(path, exceptions) {
	if (existsSync(path)) {
		const files = readdirSync(path);
		for (const file of files) {
			const curPath = `${path}/${file}`;
			if (exceptions && exceptions.find(e => curPath.endsWith(e))) {
				continue;
			}

			const stat = statSync(curPath);
			if (stat.isDirectory()) {
				deleteFoldersRecursive(curPath);
				rmdirSync(curPath);
			} else {
				unlinkSync(curPath);
			}
		}
	}
}

function npmInstall() {
	return new Promise((resolve, reject) => {
		// Install node modules
		const cwd = src.replace(/\\/g, "/");

		const cmd = `npm install -f`;
		console.log(`"${cmd} in ${cwd}`);

		// System call used for update of js-controller itself,
		// because during the installation npm packet will be deleted too, but some files must be loaded even during the installation process.
		const exec = _exec;
		const child = exec(cmd, { cwd });

		child.stderr.pipe(process.stderr);
		child.stdout.pipe(process.stdout);

		child.on("exit", code => {
			// code 1 is a strange error that cannot be explained. Everything is installed but error :(
			if (code && code !== 1) {
				reject(`Cannot install: ${code}`);
			} else {
				console.log(`"${cmd} in ${cwd} finished.`);
				// command succeeded
				resolve();
			}
		});
	});
}

function build() {
	const version = JSON.parse(readFileSync(`${__dirname}/package.json`).toString("utf8")).version;
	const data = JSON.parse(readFileSync(`${src}package.json`).toString("utf8"));

	data.version = version;

	writeFileSync(`${src}package.json`, JSON.stringify(data, null, 4));

	return new Promise((resolve, reject) => {
		const options = {
			stdio: "pipe",
			cwd: src,
		};

		console.log(options.cwd);

		let script = `${src}node_modules/@craco/craco/dist/bin/craco.js`;
		if (!existsSync(script)) {
			script = `${__dirname}/node_modules/@craco/craco/dist/bin/craco.js`;
		}
		if (!existsSync(script)) {
			console.error(`Cannot find execution file: ${script}`);
			reject(`Cannot find execution file: ${script}`);
		} else {
			const child = fork(script, ["build"], options);
			child.stdout.on("data", data => console.log(data.toString()));
			child.stderr.on("data", data => console.log(data.toString()));
			child.on("close", code => {
				console.log(`child process exited with code ${code}`);
				code ? reject(`Exit code: ${code}`) : resolve();
			});
		}
	});
}

task("0-clean", done => {
	deleteFoldersRecursive(`${__dirname}/admin/custom`);
	deleteFoldersRecursive(`${__dirname}/src-admin/build`);
	done();
});

task("1-npm", async () => npmInstall());
task("2-compile", async () => build());

task("3-copy", () =>
	Promise.all([
		_src(["src-admin/build/static/js/*.js", "!src-admin/build/static/js/vendors*.js"]).pipe(
			dest("admin/custom/static/js"),
		),
		_src(["src-admin/build/static/js/*.map", "!src-admin/build/static/js/vendors*.map"]).pipe(
			dest("admin/custom/static/js"),
		),
		_src(["src-admin/build/customComponents.js"]).pipe(dest("admin/custom")),
		_src(["src-admin/build/customComponents.js.map"]).pipe(dest("admin/custom")),
		_src(["src-admin/src/i18n/*.json"]).pipe(dest("admin/custom/i18n")),
	]),
);

task("build", series(["0-clean", "1-npm", "2-compile", "3-copy"]));

task("default", series(["build"]));
