import { expect } from "chai";
import debugModule from "debug";
import sinon from "sinon";
import { MockServerController } from "../test/mocks/mockServerController.js";
import { ConnectionTest } from "./connectionTest.js";
import { Translate } from "./translate.js";

const debug = debugModule("testing:connectionTest");

class TranslationMock implements Translate {
	translateTo(language: ioBroker.Languages, textKey: string, _context?: Record<string, string>): Promise<string> {
		return Promise.resolve(textKey);
	}
	public async getTranslatedObject(
		textKey: string,
		_context?: Record<string, unknown>,
	): Promise<ioBroker.Translated> {
		return Promise.resolve({
			de: textKey,
			en: textKey,
			es: textKey,
			fr: textKey,
			it: textKey,
			nl: textKey,
			pl: textKey,
			pt: textKey,
			ru: textKey,
			uk: textKey,
			"zh-cn": textKey,
		});
	}

	public async translate(textKey: string, _context?: Record<string, unknown>): Promise<string> {
		return Promise.resolve(textKey);
	}

	public async translateObject(textKey: string, _context?: Record<string, unknown>): Promise<string> {
		return Promise.resolve(textKey);
	}
}

describe("connectionTest", function () {
	describe("Name resolution", function () {
		it(`something.invalid should not be resolved`, async function () {
			const sut = new ConnectionTest(new TranslationMock());
			await expect(sut.resolveName("something.invalid")).to.be.rejectedWith(Error);
		});

		it(`127.0.0.1 should be resolved to 127.0.0.1`, async function () {
			const sut = new ConnectionTest(new TranslationMock());
			const result = await sut.resolveName("127.0.0.1");
			expect(result).to.be.equal("127.0.0.1");
		});

		it(`localhost should be resolved to 127.0.0.1`, async function () {
			const sut = new ConnectionTest(new TranslationMock());
			const result = await sut.resolveName("localhost");
			expect(result).to.be.equal("127.0.0.1");
		});
	});

	describe("Ping", function () {
		this.timeout(30_000);
		it(`ping to 192.0.2.0 should fail`, async function () {
			this.slow(10_000);
			const sut = new ConnectionTest(new TranslationMock());
			await expect(sut.ping("192.0.2.0")).to.be.rejected;
		});

		it(`ping to 127.0.0.1 should pass`, async function () {
			const sut = new ConnectionTest(new TranslationMock());
			await expect(sut.ping("127.0.0.1")).to.be.fulfilled;
		});

		it(`ping to localhost should fail`, async function () {
			const sut = new ConnectionTest(new TranslationMock());
			await expect(sut.ping("localhost")).to.be.rejected;
		});

		it(`ping to 8.8.8.8 should pass`, async function () {
			const sut = new ConnectionTest(new TranslationMock());
			await expect(sut.ping("8.8.8.8")).to.be.fulfilled;
		});
	});

	describe("TLS Socket connection", function () {
		this.timeout(30_000);

		it(`shouldn't connect to 192.0.2.0`, async function () {
			this.slow(25_000);
			const sut = new ConnectionTest(new TranslationMock());
			await expect(sut.connectTlsSocket("192.0.2.0", 51200)).to.be.rejected;
		});

		it(`should connect to localhost`, async function () {
			this.slow(2_000);
			debug("Starting mock server");
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer();
			debug("Mock server started");
			debug("Creating connection options");
			const sut = new ConnectionTest(new TranslationMock());
			debug("Connecting to localhost");
			await expect(
				sut.connectTlsSocket("localhost", 51200, MockServerController.getMockServerConnectionOptions()),
			).to.be.fulfilled;
			debug("Connected to localhost");
		});
	});

	describe("Login", function () {
		this.timeout(10_000);
		this.slow(2_000);

		it(`shouldn't login with the wrong password`, async function () {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer();
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			await expect(sut.login("localhost", "wrongpwd", connectionOptions)).to.be.rejectedWith(Error);
		});

		it(`should login with the correct password`, async function () {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer();
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			await expect(sut.login("localhost", "velux123", connectionOptions)).to.be.fulfilled;
		});
	});

	describe("runTests", function () {
		it(`should fulfil`, async function () {
			this.timeout(10_000);
			this.slow(2_000);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer();
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			await expect(sut.runTests("localhost", "velux123", connectionOptions)).to.be.fulfilled;
		});

		it(`should return 4 steps`, async function () {
			this.timeout(10_000);
			this.slow(2_000);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer();
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			expect(result).to.have.lengthOf(4);
		});

		it(`should fail at step 1`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			const step1stub = sinon.stub(sut, "resolveName").rejects();
			const step2stub = sinon.stub(sut, "ping").rejects();
			const step3stub = sinon.stub(sut, "connectTlsSocket").rejects();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			expect(result).to.have.lengthOf(4);
			expect(step1stub, "Step 1").to.be.calledOnce;
			expect(step2stub, "Step 2").not.to.be.called;
			expect(step3stub, "Step 3").not.to.be.called;
			expect(step4stub, "Step 4").not.to.be.called;
			expect(result[0]).to.haveOwnProperty("run", true);
			expect(result[0]).to.haveOwnProperty("stepOrder", 1);
			expect(result[0]).to.haveOwnProperty("success", false);
			expect(result[0]).to.haveOwnProperty("message");
		});

		it(`should succeed at step 1`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").rejects();
			const step3stub = sinon.stub(sut, "connectTlsSocket").rejects();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			expect(result).to.have.lengthOf(4);
			expect(step1stub, "Step 1").to.be.calledOnce;
			expect(step2stub, "Step 2").to.be.calledOnce;
			expect(step3stub, "Step 3").not.to.be.called;
			expect(step4stub, "Step 4").not.to.be.called;
			expect(result[0]).to.haveOwnProperty("run", true);
			expect(result[0]).to.haveOwnProperty("stepOrder", 1);
			expect(result[0]).to.haveOwnProperty("success", true);
			expect(result[0]).to.haveOwnProperty("result", "127.0.0.1");
		});

		it(`should fail at step 2`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").rejects();
			const step3stub = sinon.stub(sut, "connectTlsSocket").rejects();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			expect(result).to.have.lengthOf(4);
			expect(step1stub, "Step 1").to.be.calledOnce;
			expect(step2stub, "Step 2").to.be.calledOnce;
			expect(step3stub, "Step 3").not.to.be.called;
			expect(step4stub, "Step 4").not.to.be.called;
			expect(result[1]).to.haveOwnProperty("run", true);
			expect(result[1]).to.haveOwnProperty("stepOrder", 2);
			expect(result[1]).to.haveOwnProperty("success", false);
			expect(result[1]).to.haveOwnProperty("message");
		});

		it(`should succeed at step 2`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").resolves(12);
			const step3stub = sinon.stub(sut, "connectTlsSocket").rejects();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			expect(result).to.have.lengthOf(4);
			expect(step1stub, "Step 1").to.be.calledOnce;
			expect(step2stub, "Step 2").to.be.calledOnce;
			expect(step3stub, "Step 3").to.be.calledOnce;
			expect(step4stub, "Step 4").not.to.be.called;
			expect(result[1]).to.haveOwnProperty("run", true);
			expect(result[1]).to.haveOwnProperty("stepOrder", 2);
			expect(result[1]).to.haveOwnProperty("success", true);
			expect(result[1]).to.haveOwnProperty("result", 12);
		});

		it(`should fail at step 3`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").resolves(12);
			const step3stub = sinon.stub(sut, "connectTlsSocket").rejects();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			expect(result).to.have.lengthOf(4);
			expect(step1stub, "Step 1").to.be.calledOnce;
			expect(step2stub, "Step 2").to.be.calledOnce;
			expect(step3stub, "Step 3").to.be.calledOnce;
			expect(step4stub, "Step 4").not.to.be.called;
			expect(result[2]).to.haveOwnProperty("run", true);
			expect(result[2]).to.haveOwnProperty("stepOrder", 3);
			expect(result[2]).to.haveOwnProperty("success", false);
			expect(result[2]).to.haveOwnProperty("message");
		});

		it(`should succeed at step 3`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").resolves(12);
			const step3stub = sinon.stub(sut, "connectTlsSocket").resolves();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			expect(result).to.have.lengthOf(4);
			expect(step1stub, "Step 1").to.be.calledOnce;
			expect(step2stub, "Step 2").to.be.calledOnce;
			expect(step3stub, "Step 3").to.be.calledOnce;
			expect(step4stub, "Step 4").to.be.calledOnce;
			expect(result[2]).to.haveOwnProperty("run", true);
			expect(result[2]).to.haveOwnProperty("stepOrder", 3);
			expect(result[2]).to.haveOwnProperty("success", true);
			expect(result[2]).to.haveOwnProperty("message");
		});

		it(`should fail at step 4`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").resolves(12);
			const step3stub = sinon.stub(sut, "connectTlsSocket").resolves();
			const step4stub = sinon.stub(sut, "login").rejects();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			expect(result).to.have.lengthOf(4);
			expect(step1stub, "Step 1").to.be.calledOnce;
			expect(step2stub, "Step 2").to.be.calledOnce;
			expect(step3stub, "Step 3").to.be.calledOnce;
			expect(step4stub, "Step 4").to.be.calledOnce;
			expect(result[3]).to.haveOwnProperty("run", true);
			expect(result[3]).to.haveOwnProperty("stepOrder", 4);
			expect(result[3]).to.haveOwnProperty("success", false);
		});

		it(`should succeed at step 4`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			const step1stub = sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			const step2stub = sinon.stub(sut, "ping").resolves(12);
			const step3stub = sinon.stub(sut, "connectTlsSocket").resolves();
			const step4stub = sinon.stub(sut, "login").resolves();
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			expect(result).to.have.lengthOf(4);
			expect(step1stub, "Step 1").to.be.calledOnce;
			expect(step2stub, "Step 2").to.be.calledOnce;
			expect(step3stub, "Step 3").to.be.calledOnce;
			expect(step4stub, "Step 4").to.be.calledOnce;
			expect(result[3]).to.haveOwnProperty("run", true);
			expect(result[3]).to.haveOwnProperty("stepOrder", 4);
			expect(result[3]).to.haveOwnProperty("success", true);
			expect(result[3]).to.haveOwnProperty("message");
		});

		it(`should call the progress callback 4 times`, async function () {
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			sinon.stub(sut, "resolveName").resolves("127.0.0.1");
			sinon.stub(sut, "ping").resolves(12);
			sinon.stub(sut, "connectTlsSocket").resolves();
			sinon.stub(sut, "login").resolves();
			const progressCallback = sinon.spy();
			await sut.runTests("localhost", "velux123", connectionOptions, progressCallback);
			expect(progressCallback).to.be.callCount(4);
		});

		it(`should succeed at step 4 against mock server`, async function () {
			this.timeout(10_000);
			this.slow(2_000);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- We need the side effect of having a process listening on localhost:51200
			await using mockServerController = await MockServerController.createMockServer();
			const connectionOptions = MockServerController.getMockServerConnectionOptions();
			const sut = new ConnectionTest(new TranslationMock());
			const result = await sut.runTests("localhost", "velux123", connectionOptions);
			expect(result).to.have.lengthOf(4);
			expect(result[3]).to.haveOwnProperty("run", true);
			expect(result[3]).to.haveOwnProperty("stepOrder", 4);
			expect(result[3]).to.haveOwnProperty("success", true);
			expect(result[3]).to.haveOwnProperty("message");
		});
	});
});

