import * as I18n from "@iobroker/adapter-core/i18n";
import debugModule from "debug";
import assert from "node:assert/strict";
import { join } from "node:path";
import { env } from "node:process";
import sinon from "sinon";
import { MockServerController } from "../test/mocks/mockServerController.js";
import { ConnectionTest } from "./connectionTest.js";

const debug = debugModule("testing:connectionTest");

const RunsInCITests = env.CI === "true";

describe("connectionTest", function () {
	this.beforeAll(async function () {
		await I18n.init(join(import.meta.dirname, "..", "admin"), "en");
	});

	describe("Name resolution", function () {
		it(`something.invalid should not be resolved`, async function () {
			const sut = new ConnectionTest();
			await assert.rejects(sut.resolveName("something.invalid"), Error);
		});

		it(`127.0.0.1 should be resolved to 127.0.0.1`, async function () {
			const sut = new ConnectionTest();
			const result = await sut.resolveName("127.0.0.1");
			assert.strictEqual(result, "127.0.0.1");
		});

		it(`localhost should be resolved to 127.0.0.1 (or ::1)`, async function () {
			const sut = new ConnectionTest();
			const result = await sut.resolveName("localhost");
			assert.ok(
				["127.0.0.1", "::1"].includes(result),
				`Expected "127.0.0.1" or "::1", but got ${JSON.stringify(result)}!`,
			);
		});
	});

	describe("Ping", function () {
		this.timeout(30_000);
		it(`ping to 192.0.2.0 should fail`, async function () {
			if (RunsInCITests) {
				this.skip();
			} else {
				this.slow(10_000);
				const sut = new ConnectionTest();
				await assert.rejects(sut.ping("192.0.2.0"));
			}
		});

		it(`ping to 127.0.0.1 should pass`, async function () {
			if (RunsInCITests) {
				this.skip();
			} else {
				const sut = new ConnectionTest();
				await assert.doesNotReject(sut.ping("127.0.0.1"));
			}
		});

		it(`ping to localhost should pass`, async function () {
			if (RunsInCITests) {
				this.skip();
			} else {
				const sut = new ConnectionTest();
				await assert.doesNotReject(sut.ping("localhost"));
			}
		});

		it(`ping to 8.8.8.8 should pass`, async function () {
			if (RunsInCITests) {
				this.skip();
			} else {
				const sut = new ConnectionTest();
				await assert.doesNotReject(sut.ping("8.8.8.8"));
			}
		});
	});

	describe("TLS Socket connection", function () {
		this.timeout(60_000);

		it(`shouldn't connect to 192.0.2.0`, async function () {
			if (RunsInCITests) {
				this.skip();
			} else {
				this.slow(25_000);
				const sut = new ConnectionTest();
				await assert.rejects(sut.connectTlsSocket("192.0.2.0", 51200));
			}
		});

		it(`should connect to localhost`, async function () {
			this.slow(2_000);
			debug("Starting mock server");
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer();
			debug("Mock server started");
			debug("Creating connection options");
			const sut = new ConnectionTest();
			debug("Connecting to localhost");
			await assert.doesNotReject(
				sut.connectTlsSocket("localhost", 51200, MockServerController.getMockServerConnectionOptions()),
			);
			debug("Connected to localhost");
		});

		it(`should succeed on an expired certificate`, async function () {
			this.slow(2_000);
			debug("Starting mock server");
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer(true);
			debug("Mock server started");
			const connectionOptions = MockServerController.getMockServerConnectionOptions(true);
			const sut = new ConnectionTest();
			debug("Connecting with correct fingerprint on expired certificate");
			// When a certificate is expired but the fingerprint matches the pinned fingerprint,
			// the connection should be accepted (this simulates the VELUX gateway scenario)
			await assert.doesNotReject(
				sut.connectTlsSocket(
					"localhost",
					51200,
					connectionOptions,
					"78:0E:43:3D:ED:C7:59:17:0C:CF:14:9A:DB:D5:5C:1C:BC:7D:17:BB",
				),
			);
			debug("Connection succeeded with correct fingerprint");
		});

		it(`should fail on an expired certificate with wrong fingerprint`, async function () {
			this.slow(2_000);
			debug("Starting mock server");
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer(true);
			debug("Mock server started");
			const connectionOptions = MockServerController.getMockServerConnectionOptions(true);
			const sut = new ConnectionTest();
			debug("Connecting with correct fingerprint on expired certificate");
			// When a certificate is expired but the fingerprint matches the pinned fingerprint,
			// the connection should be accepted (this simulates the VELUX gateway scenario)
			await assert.rejects(
				sut.connectTlsSocket(
					"localhost",
					51200,
					connectionOptions,
					"00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00",
				),
				/CERT_HAS_EXPIRED/,
			);
			debug("Connection failed with wrong fingerprint");
		});
	});

	describe("Login", function () {
		this.timeout(10_000);
		this.slow(2_000);

		it(`shouldn't login with the wrong password`, async function () {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer();
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			await assert.rejects(sut.login("localhost", "wrongpwd", connectionOptions), Error);
		});

		it(`should login with the correct password`, async function () {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer();
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			await assert.doesNotReject(sut.login("localhost", "velux123", connectionOptions));
		});
	});

	describe("runTests", function () {
		it(`should fulfil`, async function () {
			this.timeout(10_000);
			this.slow(2_000);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer();
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			await assert.doesNotReject(sut.runTests("localhost", "velux123", connectionOptions));
		});

		it(`should return 4 steps`, async function () {
			this.timeout(10_000);
			this.slow(2_000);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer();
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			assert.strictEqual(result.length, 4);
		});

		it(`should fail at step 1`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			const step1stub = sinon.stub(sut, "resolveName").rejects();
			const step2stub = sinon.stub(sut, "ping").rejects();
			const step3stub = sinon.stub(sut, "connectTlsSocket").rejects();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			assert.strictEqual(result.length, 4);
			assert.ok(step1stub.calledOnce, "Step 1");
			assert.ok(step2stub.notCalled, "Step 2");
			assert.ok(step3stub.notCalled, "Step 3");
			assert.ok(step4stub.notCalled, "Step 4");
			assert.strictEqual(result[0].run, true);
			assert.strictEqual(result[0].stepOrder, 1);
			assert.strictEqual(result[0].success, false);
			assert.ok(Object.hasOwn(result[0], "message"));
		});

		it(`should succeed at step 1`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").rejects();
			const step3stub = sinon.stub(sut, "connectTlsSocket").rejects();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			assert.strictEqual(result.length, 4);
			assert.ok(step1stub.calledOnce, "Step 1");
			assert.ok(step2stub.calledOnce, "Step 2");
			assert.ok(step3stub.notCalled, "Step 3");
			assert.ok(step4stub.notCalled, "Step 4");
			assert.strictEqual(result[0].run, true);
			assert.strictEqual(result[0].stepOrder, 1);
			assert.strictEqual(result[0].success, true);
			assert.strictEqual(result[0].result, "127.0.0.1");
		});

		it(`should fail at step 2`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").rejects();
			const step3stub = sinon.stub(sut, "connectTlsSocket").rejects();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			assert.strictEqual(result.length, 4);
			assert.ok(step1stub.calledOnce, "Step 1");
			assert.ok(step2stub.calledOnce, "Step 2");
			assert.ok(step3stub.notCalled, "Step 3");
			assert.ok(step4stub.notCalled, "Step 4");
			assert.strictEqual(result[1].run, true);
			assert.strictEqual(result[1].stepOrder, 2);
			assert.strictEqual(result[1].success, false);
			assert.ok(Object.hasOwn(result[1], "message"));
		});

		it(`should succeed at step 2`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").resolves(12);
			const step3stub = sinon.stub(sut, "connectTlsSocket").rejects();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			assert.strictEqual(result.length, 4);
			assert.ok(step1stub.calledOnce, "Step 1");
			assert.ok(step2stub.calledOnce, "Step 2");
			assert.ok(step3stub.calledOnce, "Step 3");
			assert.ok(step4stub.notCalled, "Step 4");
			assert.strictEqual(result[1].run, true);
			assert.strictEqual(result[1].stepOrder, 2);
			assert.strictEqual(result[1].success, true);
			assert.strictEqual(result[1].result, 12);
		});

		it(`should fail at step 3`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").resolves(12);
			const step3stub = sinon.stub(sut, "connectTlsSocket").rejects();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			assert.strictEqual(result.length, 4);
			assert.ok(step1stub.calledOnce, "Step 1");
			assert.ok(step2stub.calledOnce, "Step 2");
			assert.ok(step3stub.calledOnce, "Step 3");
			assert.ok(step4stub.notCalled, "Step 4");
			assert.strictEqual(result[2].run, true);
			assert.strictEqual(result[2].stepOrder, 3);
			assert.strictEqual(result[2].success, false);
			assert.ok(Object.hasOwn(result[2], "message"));
		});

		it(`should succeed at step 3`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").resolves(12);
			const step3stub = sinon.stub(sut, "connectTlsSocket").resolves();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			assert.strictEqual(result.length, 4);
			assert.ok(step1stub.calledOnce, "Step 1");
			assert.ok(step2stub.calledOnce, "Step 2");
			assert.ok(step3stub.calledOnce, "Step 3");
			assert.ok(step4stub.calledOnce, "Step 4");
			assert.strictEqual(result[2].run, true);
			assert.strictEqual(result[2].stepOrder, 3);
			assert.strictEqual(result[2].success, true);
			assert.ok(Object.hasOwn(result[2], "message"));
		});

		it(`should fail at step 4`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").resolves(12);
			const step3stub = sinon.stub(sut, "connectTlsSocket").resolves();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			assert.strictEqual(result.length, 4);
			assert.ok(step1stub.calledOnce, "Step 1");
			assert.ok(step2stub.calledOnce, "Step 2");
			assert.ok(step3stub.calledOnce, "Step 3");
			assert.ok(step4stub.calledOnce, "Step 4");
			assert.strictEqual(result[3].run, true);
			assert.strictEqual(result[3].stepOrder, 4);
			assert.strictEqual(result[3].success, false);
		});

		it(`should succeed at step 4`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").resolves(12);
			const step3stub = sinon.stub(sut, "connectTlsSocket").resolves();
			const step4stub = sinon.stub(sut, "login").resolves();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			assert.strictEqual(result.length, 4);
			assert.ok(step1stub.calledOnce, "Step 1");
			assert.ok(step2stub.calledOnce, "Step 2");
			assert.ok(step3stub.calledOnce, "Step 3");
			assert.ok(step4stub.calledOnce, "Step 4");
			assert.strictEqual(result[3].run, true);
			assert.strictEqual(result[3].stepOrder, 4);
			assert.strictEqual(result[3].success, true);
			assert.ok(Object.hasOwn(result[3], "message"));
		});

		it(`should call the progress callback 4 times`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest();
			sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			sinon.stub(sut, "ping").resolves(12);
			sinon.stub(sut, "connectTlsSocket").resolves();
			sinon.stub(sut, "login").resolves();
			const progressCallback = sinon.spy();
			await sut.runTests("localhost", "velux123", connectionOptions, progressCallback);
			assert.strictEqual(progressCallback.callCount, 4);
		});

		it(`should succeed at step 1 against mock server`, async function () {
			if (RunsInCITests) {
				this.skip();
			} else {
				this.timeout(10_000);
				this.slow(2_000);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
				await using mockServerController = await MockServerController.createMockServer();
				const connectionOptions = MockServerController.getMockServerConnectionOptions();
				const sut = new ConnectionTest();
				sinon.stub(sut, "ping").resolves(12);
				const result = await sut.runTests("localhost", "velux123", connectionOptions);
				assert.strictEqual(result.length, 4);
				assert.strictEqual(result[0].run, true);
				assert.strictEqual(result[0].stepOrder, 1);
				assert.strictEqual(result[0].success, true);
				assert.ok(Object.hasOwn(result[0], "message"));
			}
		});

		it(`should succeed at step 2 against mock server`, async function () {
			if (RunsInCITests) {
				this.skip();
			} else {
				this.timeout(10_000);
				this.slow(2_000);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
				await using mockServerController = await MockServerController.createMockServer();
				const connectionOptions = MockServerController.getMockServerConnectionOptions();
				const sut = new ConnectionTest();
				sinon.stub(sut, "ping").resolves(12);
				const result = await sut.runTests("localhost", "velux123", connectionOptions);
				assert.strictEqual(result.length, 4);
				assert.strictEqual(result[1].run, true);
				assert.strictEqual(result[1].stepOrder, 2);
				assert.strictEqual(result[1].success, true);
				assert.ok(Object.hasOwn(result[1], "message"));
			}
		});

		it(`should succeed at step 3 against mock server`, async function () {
			if (RunsInCITests) {
				this.skip();
			} else {
				this.timeout(10_000);
				this.slow(2_000);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
				await using mockServerController = await MockServerController.createMockServer();
				const connectionOptions = MockServerController.getMockServerConnectionOptions();
				const sut = new ConnectionTest();
				sinon.stub(sut, "ping").resolves(12);
				const result = await sut.runTests("localhost", "velux123", connectionOptions);
				assert.strictEqual(result.length, 4);
				assert.strictEqual(result[2].run, true);
				assert.strictEqual(result[2].stepOrder, 3);
				assert.strictEqual(result[2].success, true);
				assert.ok(Object.hasOwn(result[2], "message"));
			}
		});

		it(`should succeed at step 4 against mock server`, async function () {
			if (RunsInCITests) {
				this.skip();
			} else {
				this.timeout(10_000);
				this.slow(2_000);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
				await using mockServerController = await MockServerController.createMockServer();
				const connectionOptions = MockServerController.getMockServerConnectionOptions();
				const sut = new ConnectionTest();
				sinon.stub(sut, "ping").resolves(12);
				const result = await sut.runTests("localhost", "velux123", connectionOptions);
				assert.strictEqual(result.length, 4);
				assert.strictEqual(result[3].run, true);
				assert.strictEqual(result[3].stepOrder, 4);
				assert.strictEqual(result[3].success, true);
				assert.ok(Object.hasOwn(result[3], "message"));
			}
		});
	});
});
