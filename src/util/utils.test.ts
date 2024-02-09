// Don't delete this line otherwise on save some weird changes will be introduced!
import { utils } from "@iobroker/testing";
import { expect, use } from "chai";
import { Disposable, GW_SESSION_FINISHED_NTF, GatewayCommand, IConnection, IGW_FRAME_RCV, Listener } from "klf-200-api";
import { ArrayCount, convertErrorToString, waitForSessionFinishedNtfAsync } from "./utils";
import sinon = require("sinon");
import sinonChai = require("sinon-chai");
import chaiAsPromised = require("chai-as-promised");

use(sinonChai);
use(chaiAsPromised);

class MockDisposable implements Disposable {
	dispose(): void {}
}

class MockConnect implements IConnection {
	private _onHandler!: Listener<IGW_FRAME_RCV>;
	onFrameSent = sinon.stub();
	loginAsync = sinon.stub();
	logoutAsync = sinon.stub();
	sendFrameAsync = sinon.stub();
	public on(handler: Listener<IGW_FRAME_RCV>, _filter?: GatewayCommand[] | undefined): Disposable {
		this._onHandler = handler;
		return new MockDisposable();
	}
	KLF200SocketProtocol = undefined;
	public sendEvent(event: IGW_FRAME_RCV): void {
		this._onHandler(event);
	}
}

const mockConnection = new MockConnect();

describe("utils", function () {
	describe("ArrayCount", function () {
		it("should count the number of non-empty elements", function () {
			const testData: number[] = [];
			testData[10] = 42;
			testData[20] = 43;

			expect(ArrayCount(testData)).to.be.equal(2);
		});

		it("should work on an empty array", function () {
			const testData: number[] = [];

			expect(ArrayCount(testData)).to.be.equal(0);
		});

		it("should work on an empty array with a defined length", function () {
			const testData: number[] = [];
			testData.length = 10;

			expect(ArrayCount(testData)).to.be.equal(0);
		});
	});

	describe("convertErrorToString", function () {
		it("should return the provided string on string input", function () {
			const testData: string = "42";
			const expectedResult: string = "42";
			expect(convertErrorToString(testData)).to.be.equal(expectedResult);
		});

		it("should return the provided message on Error input", function () {
			const testData: Error = new Error("42");
			const expectedResult: string = "Error: 42";
			expect(convertErrorToString(testData)).to.be.equal(expectedResult);
		});
	});

	describe("waitForSessionFinishedNtfAsync", function () {
		// Create mocks and asserts
		const { adapter, database } = utils.unit.createMocks({});

		let clock: sinon.SinonFakeTimers;

		this.beforeEach(() => {
			clock = sinon.useFakeTimers();
			// Mock timer functions
			adapter.setTimeout = sinon.stub().callsFake(setTimeout);
			adapter.clearTimeout = sinon.stub().callsFake(clearTimeout);
		});

		afterEach(() => {
			// The mocks keep track of all method invocations - reset them after each single test
			adapter.resetMockHistory();
			// We want to start each test with a fresh database
			database.clear();
			clock.restore();
		});

		it("should be fulfilled when the notification is sent", async function () {
			const mockFrame = sinon.createStubInstance(GW_SESSION_FINISHED_NTF);
			sinon.define(mockFrame, "SessionID", 42);
			const testPromise = waitForSessionFinishedNtfAsync(
				adapter as unknown as ioBroker.Adapter,
				mockConnection,
				42,
				10000,
			);
			// Send notification
			mockConnection.sendEvent(mockFrame);
			clock.runAll();
			return expect(testPromise).to.be.fulfilled;
		});

		it("should be rejected when the notification is not sent", async function () {
			const mockFrame = sinon.createStubInstance(GW_SESSION_FINISHED_NTF);
			sinon.define(mockFrame, "SessionID", 42);
			const testPromise = waitForSessionFinishedNtfAsync(
				adapter as unknown as ioBroker.Adapter,
				mockConnection,
				42,
				10000,
			);
			clock.runAll();
			return expect(testPromise).to.be.rejectedWith("Timeout error");
		});
	});
});
