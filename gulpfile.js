const gulp = require("gulp");
const fs = require("node:fs");
const cp = require("node:child_process");
const src = `${__dirname}/src-admin/`;

function deleteFoldersRecursive(path, exceptions) {
	if (fs.existsSync(path)) {
		const files = fs.readdirSync(path);
		for (const file of files) {
			const curPath = `${path}/${file}`;
			if (exceptions && exceptions.find(e => curPath.endsWith(e))) {
				continue;
			}

			const stat = fs.statSync(curPath);
			if (stat.isDirectory()) {
				deleteFoldersRecursive(curPath);
				fs.rmdirSync(curPath);
			} else {
				fs.unlinkSync(curPath);
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
		const exec = cp.exec;
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
	const version = JSON.parse(fs.readFileSync(`${__dirname}/package.json`).toString("utf8")).version;
	const data = JSON.parse(fs.readFileSync(`${src}package.json`).toString("utf8"));

	data.version = version;

	fs.writeFileSync(`${src}package.json`, JSON.stringify(data, null, 4));

	return new Promise((resolve, reject) => {
		const options = {
			stdio: "pipe",
			cwd: src,
		};

		console.log(options.cwd);

		let script = `${src}node_modules/@craco/craco/dist/bin/craco.js`;
		if (!fs.existsSync(script)) {
			script = `${__dirname}/node_modules/@craco/craco/dist/bin/craco.js`;
		}
		if (!fs.existsSync(script)) {
			console.error(`Cannot find execution file: ${script}`);
			reject(`Cannot find execution file: ${script}`);
		} else {
			const child = cp.fork(script, ["build"], options);
			child.stdout.on("data", data => console.log(data.toString()));
			child.stderr.on("data", data => console.log(data.toString()));
			child.on("close", code => {
				console.log(`child process exited with code ${code}`);
				code ? reject(`Exit code: ${code}`) : resolve();
			});
		}
	});
}

gulp.task("0-clean", done => {
	deleteFoldersRecursive(`${__dirname}/admin/custom`);
	deleteFoldersRecursive(`${__dirname}/src-admin/build`);
	done();
});

gulp.task("1-npm", async () => npmInstall());
gulp.task("2-compile", async () => build());

gulp.task("3-copy", () =>
	Promise.all([
		gulp
			.src(["src-admin/build/static/js/*.js", "!src-admin/build/static/js/vendors*.js"])
			.pipe(gulp.dest("admin/custom/static/js")),
		gulp
			.src(["src-admin/build/static/js/*.map", "!src-admin/build/static/js/vendors*.map"])
			.pipe(gulp.dest("admin/custom/static/js")),
		gulp.src(["src-admin/build/customComponents.js"]).pipe(gulp.dest("admin/custom")),
		gulp.src(["src-admin/build/customComponents.js.map"]).pipe(gulp.dest("admin/custom")),
		gulp.src(["src-admin/src/i18n/*.json"]).pipe(gulp.dest("admin/custom/i18n")),
	]),
);

gulp.task("build", gulp.series(["0-clean", "1-npm", "2-compile", "3-copy"]));

gulp.task("default", gulp.series(["build"]));
