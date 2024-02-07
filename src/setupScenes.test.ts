import { MockAdapter, utils } from "@iobroker/testing";
import { expect, use } from "chai";
import { IConnection, ParameterActive, Scene, Scenes, Velocity } from "klf-200-api";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";
import { promisify } from "util";
import { setStateAsync } from "../test/mockHelper";
import { SetupScenes } from "./setupScenes";
import {
	BaseStateChangeHandler,
	ComplexPropertyChangedHandler,
	SimplePropertyChangedHandler,
} from "./util/propertyLink";
import sinon = require("sinon");
import sinonChai = require("sinon-chai");
import chaiAsPromised = require("chai-as-promised");

use(sinonChai);
use(chaiAsPromised);

class MockConnect implements IConnection {
	onFrameSent = sinon.stub();
	loginAsync = sinon.stub();
	logoutAsync = sinon.stub();
	sendFrameAsync = sinon.stub();
	on = sinon.stub();
	KLF200SocketProtocol = undefined;
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

// const mockScenes = [mockScene];
// const mockScenes = await Scenes.createScenesAsync(mockConnection);
let mockScenes: Scenes;

describe("setupScenes", function () {
	// Create mocks and asserts
	const { adapter, database } = utils.unit.createMocks({});
	const { assertObjectExists, assertStateExists, assertStateHasValue, assertStateIsAcked, assertObjectCommon } =
		utils.unit.createAsserts(database, adapter);

	// Fake getChannelsOf
	adapter.getChannelsOf = sinon.stub();
	adapter.getChannelsOf.callsFake((parentDevice, callback) =>
		callback(null, [
			{
				_id: `${adapter.namespace}.products.42`,
				type: "channel",
				common: {
					name: "Test window",
				},
				native: {},
			},
		] as ioBroker.ChannelObject[]),
	);
	// Fake deleteChannel
	adapter.deleteChannel = sinon.stub();
	adapter.deleteChannel.callsFake((parentDevice, channelId, callback) => {
		// Delete sub-objects first
		adapter.getObjectList(
			{
				startKey: `${adapter.namespace}.${parentDevice}.${channelId}`,
				endkey: `${adapter.namespace}.${parentDevice}.${channelId}.\u9999`,
			},
			(err: any, res: { rows: { id: string; obj: any; doc: any }[] }) => {
				for (const row of res.rows) {
					adapter.delObject(row.id);
				}

				adapter.delObject(`${parentDevice}.${channelId}`, callback);
			},
		);
	});

	// Promisify additional methods
	for (const method of ["unsubscribeStates", "getChannelsOf", "deleteChannel"]) {
		Object.defineProperty(adapter, `${method}Async`, {
			configurable: true,
			enumerable: true,
			value: promisify(adapter[method as keyof MockAdapter]),
			writable: true,
		});
	}

	// Mock some EventEmitter functions
	(adapter as any).getMaxListeners = sinon.stub<[], number>().returns(100);
	(adapter as any).setMaxListeners = sinon.stub<[number], void>();

	afterEach(() => {
		// The mocks keep track of all method invocations - reset them after each single test
		adapter.resetMockHistory();
		// We want to start each test with a fresh database
		database.clear();
	});

	describe("createSceneAsync", function () {
		it("should create the channel for Scene ID 0", async function () {
			const disposables = await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene);
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
			const disposables = await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene);
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
			const disposables = await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene);
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
					adapter as unknown as ioBroker.Adapter,
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
					adapter as unknown as ioBroker.Adapter,
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
					adapter as unknown as ioBroker.Adapter,
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
					adapter as unknown as ioBroker.Adapter,
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

		const testCasesForDefaults = [
			{
				state: "velocity",
				defaultValue: 0,
			},
		];
		for (const test of testCasesForDefaults) {
			it(`should create the ${test.state} state object`, async function () {
				const expectedState = test.state;
				const disposables = await SetupScenes.createSceneAsync(
					adapter as unknown as ioBroker.Adapter,
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

			it(`should create the ${test.state} state object with a default value of ${test.defaultValue}`, async function () {
				const expectedState = test.state;
				const expectedDefaultValue = test.defaultValue;
				const disposables = await SetupScenes.createSceneAsync(
					adapter as unknown as ioBroker.Adapter,
					mockScene,
				);
				try {
					const state = await adapter.getObjectAsync(`test.0.scenes.0.${expectedState}`);
					expect(state).to.have.nested.property("common.def", expectedDefaultValue);
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
				disposables = await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene);
			});
			this.afterEach(function () {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			});

			it(`should write the ${test.state} state with '${test.value}' after change notificiation`, async function () {
				const expectedState = test.state;
				await (adapter as unknown as ioBroker.Adapter).setStateAsync(
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
					stubGetter.restore();
				}
			});

			it(`should write the ${test.state} state ack after change notificiation`, async function () {
				const expectedState = test.state;
				await (adapter as unknown as ioBroker.Adapter).setStateAsync(
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

		it(`Each writable state should be bound to a state change handler`, async function () {
			let disposables: Disposable[] = [];
			disposables = await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene);
			try {
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.scenes.${mockScene.SceneID}.`,
					endkey: `${adapter.namespace}.scenes.${mockScene.SceneID}.\u9999`,
				});
				const unmappedWritableStates = objectList.rows
					.map((value) => {
						// Find state in disposables (only for writable states)
						if (
							value.doc.type !== "state" ||
							value.doc.common.write === false ||
							disposables.some((disposable) => {
								if (disposable instanceof BaseStateChangeHandler) {
									return (
										`${(adapter as unknown as ioBroker.Adapter).namespace}.${
											disposable.StateId
										}` === value.id
									);
								} else {
									return false;
								}
							})
						) {
							// State found -> state is mapped
							return undefined;
						} else {
							// State not mapped -> add to unmapped writable states list
							return value.id;
						}
					})
					.filter((value) => value !== undefined);

				expect(
					unmappedWritableStates,
					`There are unmapped writable states: ${JSON.stringify(unmappedWritableStates)}`,
				).to.be.an("Array").empty;
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});

		it(`Each readable state should be bound to a property change handler`, async function () {
			let disposables: Disposable[] = [];
			disposables = await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene);
			try {
				const allowedUnmappedStates: string[] = [];
				const complexStatesMapping: { [prop: string]: string[] } = {
					Products: ["test.0.scenes.0.productsCount", "test.0.scenes.0.products"],
					IsRunning: ["test.0.scenes.0.run"],
				};
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.scenes.${mockScene.SceneID}.`,
					endkey: `${adapter.namespace}.scenes.${mockScene.SceneID}.\u9999`,
				});
				const unmappedWritableStates = objectList.rows
					.map((value) => {
						// Find state in disposables (only for writable states)
						if (
							value.doc.type !== "state" ||
							value.doc.common.read === false ||
							disposables.some((disposable) => {
								if (disposable instanceof SimplePropertyChangedHandler) {
									return (
										`${(adapter as unknown as ioBroker.Adapter).namespace}.${
											disposable.StateId
										}` === value.id
									);
								} else if (disposable instanceof ComplexPropertyChangedHandler) {
									return complexStatesMapping[disposable.Property as string]?.includes(value.id);
								} else if (allowedUnmappedStates.includes(value.id)) {
									return true;
								} else {
									return false;
								}
							})
						) {
							// State found -> state is mapped
							return undefined;
						} else {
							// State not mapped -> add to unmapped writable states list
							return value.id;
						}
					})
					.filter((value) => value !== undefined);

				expect(
					unmappedWritableStates,
					`There are unmapped readable states: ${JSON.stringify(unmappedWritableStates)}`,
				).to.be.an("Array").empty;
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});

		it(`Running a scene should use the velocity to start the scene.`, async function () {
			const sessionId = 42;
			const expectedVelocity = Velocity.Fast;
			const runAsyncStub = sinon.stub(mockScene, "runAsync");
			try {
				runAsyncStub.resolves(sessionId);

				let disposables: Disposable[] = [];
				disposables = await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene);
				try {
					/* Setup the state */
					await adapter.setStateAsync(`test.0.scenes.${mockScene.SceneID}.velocity`, expectedVelocity, false);
					/* Start the scene */
					// await adapter.setStateAsync(`test.0.scenes.${mockScene.SceneID}.run`, true, false); // No events implemented by mock adapter
					for (const disposable of disposables) {
						if (
							disposable instanceof BaseStateChangeHandler &&
							disposable.StateId === `scenes.${mockScene.SceneID}.run`
						) {
							await disposable.onStateChange({
								val: true,
								ack: false,
								ts: 12345,
								lc: 12345,
								from: "system.adapter.test.0",
							});
						}
					}
					/* Let it run */
					await new Promise((resolve) => {
						setTimeout(resolve, 0);
					});

					expect(runAsyncStub).to.be.calledOnce;
					expect(runAsyncStub).to.be.calledOnceWith(expectedVelocity);
				} finally {
					for (const disposable of disposables) {
						disposable.dispose();
					}
				}
			} finally {
				runAsyncStub.restore();
			}
		});
	});

	describe("createScenesAsync", function () {
		let sandbox: sinon.SinonSandbox;

		this.beforeEach(async function () {
			sandbox = sinon.createSandbox();
			sandbox.stub(Scenes.prototype, "refreshScenesAsync");
			mockScenes = await Scenes.createScenesAsync(mockConnection);
			sandbox.stub(mockScenes, "Scenes").value([mockScene]);
		});

		this.afterEach(function () {
			sandbox.restore();
		});

		it("should have 1 in the value of scenes.scenesFound state", async function () {
			const expectedValue = 1;
			const disposables = await SetupScenes.createScenesAsync(adapter as unknown as ioBroker.Adapter, mockScenes);
			try {
				assertStateHasValue("scenes.scenesFound", expectedValue);
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		it(`should delete a scene that doesn't exist anymore`, async function () {
			// Prepare objects and states
			database.publishDeviceObjects({
				_id: `${adapter.namespace}.scenes`,
			});
			database.publishChannelObjects({
				_id: `${adapter.namespace}.scenes.42`,
				common: {
					name: "Test scene",
				},
			});
			const states: string[] = ["productsCount", "run", "stop"];
			database.publishStateObjects(
				...states.map((state) => {
					return { _id: `${adapter.namespace}.scenes.42.${state}` } as ioBroker.PartialObject;
				}),
			);

			// Check, that old states exist
			states.forEach((state) => assertObjectExists(`${adapter.namespace}.scenes.42.${state}`));

			const disposables = await SetupScenes.createScenesAsync(adapter as unknown as ioBroker.Adapter, mockScenes);
			try {
				states.forEach((state) =>
					expect(
						() => assertObjectExists(`${adapter.namespace}.scenes.42.${state}`),
						`Object ${adapter.namespace}.scenes.42.${state} shouldn't exist anymore.`,
					).to.throw(),
				);
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});

		it(`should have a state refreshScenes`, async function () {
			const disposables = await SetupScenes.createScenesAsync(adapter as unknown as ioBroker.Adapter, mockScenes);
			try {
				assertObjectExists(`${adapter.namespace}.scenes.refreshScenes`);
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});

		it(`should call refreshScenesAsync when the state is set to true`, async function () {
			const disposables = await SetupScenes.createScenesAsync(adapter as unknown as ioBroker.Adapter, mockScenes);
			try {
				const currentCalls = (mockScenes.refreshScenesAsync as unknown as sinon.SinonStub).callCount;
				await setStateAsync(adapter, `scenes.refreshScenes`, true, disposables, false);
				// for (const disposable of disposables) {
				// 	if (disposable instanceof BaseStateChangeHandler && disposable.StateId === `scenes.refreshScenes`) {
				// 		await disposable.onStateChange({
				// 			val: true,
				// 			ack: false,
				// 			ts: 12345,
				// 			lc: 12345,
				// 			from: "system.adapter.test.0",
				// 		});
				// 	}
				// }
				// /* Let it run */
				// await new Promise((resolve) => {
				// 	setTimeout(resolve, 0);
				// });
				const callsAfterSetState = (mockScenes.refreshScenesAsync as unknown as sinon.SinonStub).callCount;
				expect(callsAfterSetState - currentCalls).to.be.equal(1);
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});
	});
});
