import { MockAdapter, utils } from "@iobroker/testing";
import { use } from "chai";
import { IConnection, ParameterActive, Scene } from "klf-200-api";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";
import { promisify } from "util";
import { SetupScenes } from "./setupScenes";
import sinon = require("sinon");
import sinonChai = require("sinon-chai");
import chaiAsPromised = require("chai-as-promised");

use(sinonChai);
use(chaiAsPromised);

class MockConnect implements IConnection {
	loginAsync = sinon.stub();
	logoutAsync = sinon.stub();
	sendFrameAsync = sinon.stub();
	on = sinon.stub();
	KLF200SocketProtocol: undefined;
}

const mockConnection = new MockConnect();

const mockScene = new Scene(mockConnection, 0, "Close all windows");

/* Setup products for scene */
mockScene.Products.push(
	{
		NodeID: 0,
		ParameterID: ParameterActive.MP,
		ParameterValue: 0x0000,
	},
	{
		NodeID: 1,
		ParameterID: ParameterActive.MP,
		ParameterValue: 0x0000,
	},
	{
		NodeID: 2,
		ParameterID: ParameterActive.MP,
		ParameterValue: 0x0000,
	},
);

const mockScenes = [mockScene];

describe("setupScenes", function () {
	// Create mocks and asserts
	const { adapter, database } = utils.unit.createMocks({});
	const {
		assertObjectExists,
		assertStateExists,
		assertStateHasValue,
		assertStateIsAcked,
		assertObjectCommon,
	} = utils.unit.createAsserts(database, adapter);

	// Promisify additional methods
	for (const method of ["unsubscribeStates"]) {
		Object.defineProperty(adapter, `${method}Async`, {
			configurable: true,
			enumerable: true,
			value: promisify(adapter[method as keyof MockAdapter]),
			writable: true,
		});
	}

	afterEach(() => {
		// The mocks keep track of all method invocations - reset them after each single test
		adapter.resetMockHistory();
		// We want to start each test with a fresh database
		database.clear();
	});

	describe("createSceneAsync", function () {
		it("should create the channel for Scene ID 0", async function () {
			const disposables = await SetupScenes.createSceneAsync((adapter as unknown) as ioBroker.Adapter, mockScene);
			try {
				assertObjectExists("scenes.0");
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		it("should have the name 'Close all windows' for its channel name", async function () {
			const expectedName = "Close all windows";
			const disposables = await SetupScenes.createSceneAsync((adapter as unknown) as ioBroker.Adapter, mockScene);
			try {
				assertObjectCommon("scenes.0", { name: expectedName });
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		it("should have the role 'scene' for its channel role", async function () {
			const expectedName = "Close all windows";
			const expectedRole = "scene";
			const disposables = await SetupScenes.createSceneAsync((adapter as unknown) as ioBroker.Adapter, mockScene);
			try {
				assertObjectCommon("scenes.0", { name: expectedName, role: expectedRole });
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		const testCases = [
			{
				state: "productsCount",
				value: 3,
			},
			{
				state: "run",
				value: false,
			},
			{
				state: "stop",
				value: false,
			},
		];
		for (const test of testCases) {
			it(`should create the ${test.state} state object`, async function () {
				const expectedState = test.state;
				const disposables = await SetupScenes.createSceneAsync(
					(adapter as unknown) as ioBroker.Adapter,
					mockScene,
				);
				try {
					assertObjectExists(`test.0.scenes.0.${expectedState}`);
				} finally {
					for (const disposable of await disposables) {
						disposable.dispose();
					}
				}
			});

			it(`should write the ${test.state} state`, async function () {
				const expectedState = test.state;
				const disposables = await SetupScenes.createSceneAsync(
					(adapter as unknown) as ioBroker.Adapter,
					mockScene,
				);
				try {
					assertStateExists(`test.0.scenes.0.${expectedState}`);
				} finally {
					for (const disposable of await disposables) {
						disposable.dispose();
					}
				}
			});

			it(`should write the ${test.state} state with '${test.value}'`, async function () {
				const expectedState = test.state;
				const disposables = await SetupScenes.createSceneAsync(
					(adapter as unknown) as ioBroker.Adapter,
					mockScene,
				);
				try {
					assertStateHasValue(`test.0.scenes.0.${expectedState}`, test.value);
				} finally {
					for (const disposable of await disposables) {
						disposable.dispose();
					}
				}
			});

			it(`should write the ${test.state} state ack`, async function () {
				const expectedState = test.state;
				const disposables = await SetupScenes.createSceneAsync(
					(adapter as unknown) as ioBroker.Adapter,
					mockScene,
				);
				try {
					assertStateIsAcked(`test.0.scenes.0.${expectedState}`, true);
				} finally {
					for (const disposable of await disposables) {
						disposable.dispose();
					}
				}
			});
		}

		const testCasesForChanges = [
			{
				state: "run",
				propertyName: "IsRunning",
				value: true,
			},
		];

		for (const test of testCasesForChanges) {
			let disposables: Disposable[] = [];
			this.beforeEach(async function () {
				disposables = await SetupScenes.createSceneAsync((adapter as unknown) as ioBroker.Adapter, mockScene);
			});
			this.afterEach(function () {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			});

			it(`should write the ${test.state} state with '${test.value}' after change notificiation`, async function () {
				const expectedState = test.state;
				await ((adapter as unknown) as ioBroker.Adapter).setStateAsync(
					`scenes.0.${test.state}`,
					test.value,
					false,
				);
				assertStateIsAcked(`test.0.scenes.0.${expectedState}`, false);

				// Mock the object property to reflect the desired change
				const stubGetter = sinon.stub(mockScene, test.propertyName as keyof Scene).get(() => {
					return test.value;
				});

				try {
					mockScene.propertyChangedEvent.emit({
						o: mockScene,
						propertyName: test.propertyName,
						propertyValue: test.value,
					});
					assertStateHasValue(`test.0.scenes.0.${expectedState}`, test.value);
				} finally {
					stubGetter.reset();
				}
			});

			it(`should write the ${test.state} state ack after change notificiation`, async function () {
				const expectedState = test.state;
				await ((adapter as unknown) as ioBroker.Adapter).setStateAsync(
					`scenes.0.${test.state}`,
					test.value,
					false,
				);
				assertStateIsAcked(`test.0.scenes.0.${expectedState}`, false);
				mockScene.propertyChangedEvent.emit({
					o: mockScene,
					propertyName: test.propertyName,
					propertyValue: test.value,
				});
				assertStateIsAcked(`test.0.scenes.0.${expectedState}`, true);
			});
		}
	});

	describe("createScenesAsync", function () {
		it("should have 1 in the value of scenes.scenesFound state", async function () {
			const expectedValue = 1;
			const disposables = await SetupScenes.createScenesAsync(
				(adapter as unknown) as ioBroker.Adapter,
				mockScenes,
			);
			try {
				assertStateHasValue("scenes.scenesFound", expectedValue);
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});
	});
});
