import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
// Don't delete this line otherwise on save some weird changes will be introduced!
import { utils } from "@iobroker/testing";
import {
	type Disposable,
	GW_SESSION_FINISHED_NTF,
	type GatewayCommand,
	type IConnection,
	type IGW_FRAME_RCV,
	type Listener,
} from "klf-200-api";
import { ArrayCount, convertErrorToString, waitForSessionFinishedNtfAsync } from "./utils.js";

class MockDisposable implements Disposable {
	dispose(): void {}
}

class MockConnect implements IConnection {
	private _onHandler!: Listener<IGW_FRAME_RCV>;
	onFrameSent = mock.fn<(handler: Listener<any>, filter?: GatewayCommand[]) => Disposable>(
		() => new MockDisposable(),
	);
	loginAsync = mock.fn<(password: string) => Promise<void>>(async () => {});
	logoutAsync = mock.fn<(timeout?: number) => Promise<void>>(async () => {});
	sendFrameAsync = mock.fn<any>(async () => {});
	public on(handler: Listener<IGW_FRAME_RCV>, _filter?: GatewayCommand[]): Disposable {
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

			assert.strictEqual(ArrayCount(testData), 2);
		});

		it("should work on an empty array", function () {
			const testData: number[] = [];

			assert.strictEqual(ArrayCount(testData), 0);
		});

		it("should work on an empty array with a defined length", function () {
			const testData: number[] = [];
			testData.length = 10;

			assert.strictEqual(ArrayCount(testData), 0);
		});
	});

	describe("convertErrorToString", function () {
		it("should return the provided string on string input", function () {
			const testData = "42";
			const expectedResult = "42";
			assert.strictEqual(convertErrorToString(testData), expectedResult);
		});

		it("should return the provided message on Error input", function () {
			const testData: Error = new Error("42");
			const expectedResult = "Error: 42";
			assert.strictEqual(convertErrorToString(testData), expectedResult);
		});
	});

	describe("waitForSessionFinishedNtfAsync", function () {
		// Create mocks and asserts
		const { adapter, database } = utils.unit.createMocks({});

		beforeEach(() => {
			mock.timers.enable({ apis: ["setTimeout"] });
			// Mock timer functions
			adapter.setTimeout = mock.fn(setTimeout);
			adapter.clearTimeout = mock.fn(clearTimeout);
		});

		afterEach(() => {
			// The mocks keep track of all method invocations - reset them after each single test
			adapter.resetMockHistory();
			// We want to start each test with a fresh database
			database.clear();
			mock.timers.reset();
		});

		it("should be fulfilled when the notification is sent", async function () {
			const mockFrame = Object.assign(Object.create(GW_SESSION_FINISHED_NTF.prototype), { SessionID: 42 });
			const testPromise = waitForSessionFinishedNtfAsync(
				adapter as unknown as ioBroker.Adapter,
				mockConnection,
				42,
				10000,
			);
			// Send notification
			mockConnection.sendEvent(mockFrame);
			mock.timers.tick(10000);
			return assert.doesNotReject(testPromise);
		});

		it("should be rejected when the notification is not sent", async function () {
			Object.assign(Object.create(GW_SESSION_FINISHED_NTF.prototype), { SessionID: 42 });
			const testPromise = waitForSessionFinishedNtfAsync(
				adapter as unknown as ioBroker.Adapter,
				mockConnection,
				42,
				10000,
			);
			mock.timers.tick(10000);
			return assert.rejects(testPromise, { message: "Timeout error" });
		});
	});
});
