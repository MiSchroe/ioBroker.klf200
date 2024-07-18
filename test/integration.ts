import { tests } from "@iobroker/testing";
import { TestHarness } from "@iobroker/testing/build/tests/integration/lib/harness";
import { expect } from "chai";
import { readFileSync } from "fs";
import path from "path";
import { MockServerController } from "./mocks/mockServerController";

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, ".."), {
	allowedExitCodes: [11],

	defineAdditionalTests({ suite }) {
		suite("Regular test without mock server", (getHarness) => {
			let harness: TestHarness;

			before(function () {
				harness = getHarness();
			});

			it("Should start and terminate itself with exit code 11", async function () {
				this.timeout(60_000);
				await expect(harness.startAdapterAndWait(true)).to.be.rejectedWith(Error);
				expect(harness.adapterExit).to.be.equal(11);
			});
		});

		suite("Regular test with mock server", (getHarness) => {
			let harness: TestHarness;
			let mockServerController: MockServerController;

			before(async function () {
				this.timeout(60_000);

				harness = getHarness();
				mockServerController = await MockServerController.createMockServer();

				console.log(`Setup configuration for ${harness.adapterName}`);

				// Setup adapter configuration
				await harness.changeAdapterConfig(harness.adapterName, {
					native: {
						host: "localhost",
						// line deepcode ignore NoHardcodedPasswords/test: Dummy password in unit tests.
						password: "velux123",
						enableAutomaticReboot: false,
						advancedSSLConfiguration: true,
						SSLConnectionOptions: {
							rejectUnauthorized: true,
							requestCert: true,
							ca: readFileSync(path.join(__dirname, "mocks/mockServer", "ca-crt.pem"), "utf8"),
							key: readFileSync(path.join(__dirname, "mocks/mockServer", "client1-key.pem"), "utf8"),
							cert: readFileSync(path.join(__dirname, "mocks/mockServer", "client1-crt.pem"), "utf8"),
						},
					},
					protectedNative: [],
					encryptedNative: [],
				});

				// Start adapter
				await harness.startAdapterAndWait(true);
			});

			after(async function () {
				await harness.stopAdapter();
				if (mockServerController) {
					await mockServerController[Symbol.asyncDispose]();
				}
			});

			describe("Simple startup checks", function () {
				it("Should start without error", function () {
					expect(harness.isAdapterRunning()).to.be.true;
				});
			});
		});
	},
});
