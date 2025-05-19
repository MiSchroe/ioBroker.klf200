import { type MockAdapter, utils } from "@iobroker/testing";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { type Disposable, type IConnection, ParameterActive, Scene, Scenes, Velocity } from "klf-200-api";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import type { EventEmitter } from "stream";
import { promisify } from "util";
import { setState } from "../test/mockHelper";
import { DisposalMap } from "./disposalMap";
import { SetupScenes } from "./setupScenes";
import {
	BaseStateChangeHandler,
	ComplexPropertyChangedHandler,
	SimplePropertyChangedHandler,
} from "./util/propertyLink";

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

let mockScenes: Scenes;

describe("setupScenes", function () {
	// Create mocks and asserts
	const { adapter, database } = utils.unit.createMocks({});
	const { assertObjectExists, assertStateExists, assertStateHasValue, assertStateIsAcked, assertObjectCommon } =
		utils.unit.createAsserts(database, adapter);

	// Fake getChannelsOf
	adapter.getChannelsOf = sinon.stub();
	adapter.getChannelsOf.callsFake(
		(_parentDevice: string, callback: ioBroker.GetObjectsCallback3<ioBroker.ChannelObject>) =>
			callback(null, [
				{
					_id: `${adapter.namespace}.scenes.${mockScene.SceneID}`,
					type: "channel",
					common: {
						name: mockScene.SceneName,
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

	// Fake recursive delObject:
	const delObjectStub = sinon.stub(adapter, "delObject");
	delObjectStub.withArgs(sinon.match.any, { recursive: true }).callsFake((id, recursive: any, callback) => {
		// Delete sub-objects first
		adapter.getObjectList(
			{
				startKey: `${adapter.namespace}.${id}`,
				endkey: `${adapter.namespace}.${id}.\u9999`,
			},
			(err: any, res: { rows: { id: string; obj: any; doc: any }[] }) => {
				for (const row of res.rows) {
					adapter.delObject(row.id);
				}

				adapter.delObject(id, callback);
			},
		);
	});
	delObjectStub.callThrough();

	// Promisify additional methods
	for (const method of ["unsubscribeStates", "getChannelsOf", "deleteChannel", "delObject"]) {
		Object.defineProperty(adapter, `${method}Async`, {
			configurable: true,
			enumerable: true,
			value: promisify(adapter[method as keyof MockAdapter]),
			writable: true,
		});
	}

	// Mock some EventEmitter functions
	(adapter as EventEmitter).getMaxListeners = sinon.stub<[], number>().returns(100);
	(adapter as EventEmitter).setMaxListeners = sinon.stub<[number], EventEmitter>();

	afterEach(() => {
		// The mocks keep track of all method invocations - reset them after each single test
		adapter.resetMockHistory();
		// We want to start each test with a fresh database
		database.clear();
	});

	describe("createSceneAsync", function () {
		it("should create the channel for Scene ID 0", async function () {
			const disposalMap = new DisposalMap();
			await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
			try {
				assertObjectExists("scenes.0");
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it("should have the name 'Close all windows' for its channel name", async function () {
			const expectedName = "Close all windows";
			const disposalMap = new DisposalMap();
			await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
			try {
				assertObjectCommon("scenes.0", { name: expectedName });
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it("should have the role 'scene' for its channel role", async function () {
			const expectedName = "Close all windows";
			const expectedRole = "scene";
			const disposalMap = new DisposalMap();
			await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
			try {
				assertObjectCommon("scenes.0", { name: expectedName, role: expectedRole });
			} finally {
				await disposalMap.disposeAll();
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
				const disposalMap = new DisposalMap();
				await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
				try {
					assertObjectExists(`test.0.scenes.0.${expectedState}`);
				} finally {
					await disposalMap.disposeAll();
				}
			});

			it(`should write the ${test.state} state`, async function () {
				const expectedState = test.state;
				const disposalMap = new DisposalMap();
				await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
				try {
					assertStateExists(`test.0.scenes.0.${expectedState}`);
				} finally {
					await disposalMap.disposeAll();
				}
			});

			it(`should write the ${test.state} state with '${test.value}'`, async function () {
				const expectedState = test.state;
				const disposalMap = new DisposalMap();
				await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
				try {
					assertStateHasValue(`test.0.scenes.0.${expectedState}`, test.value);
				} finally {
					await disposalMap.disposeAll();
				}
			});

			it(`should write the ${test.state} state ack`, async function () {
				const expectedState = test.state;
				const disposalMap = new DisposalMap();
				await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
				try {
					assertStateIsAcked(`test.0.scenes.0.${expectedState}`, true);
				} finally {
					await disposalMap.disposeAll();
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
				const disposalMap = new DisposalMap();
				await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
				try {
					assertObjectExists(`test.0.scenes.0.${expectedState}`);
				} finally {
					await disposalMap.disposeAll();
				}
			});

			it(`should create the ${test.state} state object with a default value of ${test.defaultValue}`, async function () {
				const expectedState = test.state;
				const expectedDefaultValue = test.defaultValue;
				const disposalMap = new DisposalMap();
				await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
				try {
					const state = (await adapter.getObjectAsync(
						`test.0.scenes.0.${expectedState}`,
					)) as ioBroker.GetObjectPromise;
					expect(state).to.have.nested.property("common.def", expectedDefaultValue);
				} finally {
					await disposalMap.disposeAll();
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
			let disposalMap: DisposalMap;
			this.beforeEach(async function () {
				disposalMap = new DisposalMap();
				await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
			});
			this.afterEach(async function () {
				await disposalMap.disposeAll();
			});

			it(`should write the ${test.state} state with '${test.value}' after change notificiation`, async function () {
				const expectedState = test.state;
				await (adapter as unknown as ioBroker.Adapter).setState(`scenes.0.${test.state}`, test.value, false);
				assertStateIsAcked(`test.0.scenes.0.${expectedState}`, false);

				// Mock the object property to reflect the desired change
				const stubGetter = sinon.stub(mockScene, test.propertyName as keyof Scene).get(() => {
					return test.value;
				});

				try {
					await mockScene.propertyChangedEvent.emit({
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
				await (adapter as unknown as ioBroker.Adapter).setState(`scenes.0.${test.state}`, test.value, false);
				assertStateIsAcked(`test.0.scenes.0.${expectedState}`, false);
				await mockScene.propertyChangedEvent.emit({
					o: mockScene,
					propertyName: test.propertyName,
					propertyValue: test.value,
				});
				assertStateIsAcked(`test.0.scenes.0.${expectedState}`, true);
			});
		}

		it(`Each writable state should be bound to a state change handler`, async function () {
			const disposalMap = new DisposalMap();
			await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
			try {
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = (await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.scenes.${mockScene.SceneID}.`,
					endkey: `${adapter.namespace}.scenes.${mockScene.SceneID}.\u9999`,
				})) as ioBroker.NonNullCallbackReturnTypeOf<ioBroker.GetObjectListCallback<ioBroker.Object>>;
				const disposables: Disposable[] = [];
				disposalMap.forEach(value => {
					disposables.push(value);
				});
				const unmappedWritableStates = objectList.rows
					.map(value => {
						// Find state in disposables (only for writable states)
						if (
							value.doc.type !== "state" ||
							value.doc.common.write === false ||
							disposables.some(disposable => {
								if (disposable instanceof BaseStateChangeHandler) {
									return (
										`${(adapter as unknown as ioBroker.Adapter).namespace}.${
											disposable.StateId
										}` === value.id
									);
								}
								return false;
							})
						) {
							// State found -> state is mapped
							return undefined;
						}
						// State not mapped -> add to unmapped writable states list
						return value.id;
					})
					.filter(value => value !== undefined);

				expect(
					unmappedWritableStates,
					`There are unmapped writable states: ${JSON.stringify(unmappedWritableStates)}`,
				).to.be.an("Array").empty;
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it(`Each readable state should be bound to a property change handler`, async function () {
			const disposalMap = new DisposalMap();
			await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
			try {
				const allowedUnmappedStates: string[] = [];
				const complexStatesMapping: { [prop: string]: string[] } = {
					Products: ["test.0.scenes.0.productsCount", "test.0.scenes.0.products"],
					IsRunning: ["test.0.scenes.0.run"],
				};
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = (await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.scenes.${mockScene.SceneID}.`,
					endkey: `${adapter.namespace}.scenes.${mockScene.SceneID}.\u9999`,
				})) as ioBroker.NonNullCallbackReturnTypeOf<ioBroker.GetObjectListCallback<ioBroker.Object>>;
				const disposables: Disposable[] = [];
				disposalMap.forEach(value => {
					disposables.push(value);
				});
				const unmappedWritableStates = objectList.rows
					.map(value => {
						// Find state in disposables (only for writable states)
						if (
							value.doc.type !== "state" ||
							value.doc.common.read === false ||
							disposables.some(disposable => {
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
								}
								return false;
							})
						) {
							// State found -> state is mapped
							return undefined;
						}
						// State not mapped -> add to unmapped writable states list
						return value.id;
					})
					.filter(value => value !== undefined);

				expect(
					unmappedWritableStates,
					`There are unmapped readable states: ${JSON.stringify(unmappedWritableStates)}`,
				).to.be.an("Array").empty;
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it(`Running a scene should use the velocity to start the scene.`, async function () {
			const sessionId = 42;
			const expectedVelocity = Velocity.Fast;
			const runAsyncStub = sinon.stub(mockScene, "runAsync");
			try {
				runAsyncStub.resolves(sessionId);

				const disposalMap = new DisposalMap();
				await SetupScenes.createSceneAsync(adapter as unknown as ioBroker.Adapter, mockScene, disposalMap);
				try {
					/* Setup the state */
					await adapter.setState(`test.0.scenes.${mockScene.SceneID}.velocity`, expectedVelocity, false);
					/* Start the scene */
					// await adapter.setState(`test.0.scenes.${mockScene.SceneID}.run`, true, false); // No events implemented by mock adapter
					for (const disposable of disposalMap.values()) {
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
					await new Promise(resolve => {
						setTimeout(resolve, 0);
					});

					expect(runAsyncStub).to.be.calledOnce;
					expect(runAsyncStub).to.be.calledOnceWith(expectedVelocity);
				} finally {
					await disposalMap.disposeAll();
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
			const disposalMap = new DisposalMap();
			await SetupScenes.createScenesAsync(adapter as unknown as ioBroker.Adapter, mockScenes, disposalMap);
			try {
				assertStateHasValue("scenes.scenesFound", expectedValue);
			} finally {
				await disposalMap.disposeAll();
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
				...states.map(state => {
					return { _id: `${adapter.namespace}.scenes.42.${state}` } as ioBroker.PartialObject;
				}),
			);

			adapter.getChannelsOf.callsFake(
				(_parentDevice: string, callback: ioBroker.GetObjectsCallback3<ioBroker.ChannelObject>) =>
					callback(null, [
						{
							_id: `${adapter.namespace}.scenes.42`,
							type: "channel",
							common: {
								name: "Test scene",
							},
							native: {},
						},
					] as ioBroker.ChannelObject[]),
			);

			// Check, that old states exist
			states.forEach(state => assertObjectExists(`${adapter.namespace}.scenes.42.${state}`));

			const disposalMap = new DisposalMap();
			await SetupScenes.createScenesAsync(adapter as unknown as ioBroker.Adapter, mockScenes, disposalMap);
			try {
				states.forEach(state =>
					expect(
						() => assertObjectExists(`${adapter.namespace}.scenes.42.${state}`),
						`Object ${adapter.namespace}.scenes.42.${state} shouldn't exist anymore.`,
					).to.throw(),
				);
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it(`should have a state refreshScenes`, async function () {
			const disposalMap = new DisposalMap();
			await SetupScenes.createScenesAsync(adapter as unknown as ioBroker.Adapter, mockScenes, disposalMap);
			try {
				assertObjectExists(`${adapter.namespace}.scenes.refreshScenes`);
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it(`should call refreshScenesAsync when the state is set to true`, async function () {
			const disposalMap = new DisposalMap();
			await SetupScenes.createScenesAsync(adapter as unknown as ioBroker.Adapter, mockScenes, disposalMap);
			try {
				const currentCalls = (mockScenes.refreshScenesAsync as unknown as sinon.SinonStub).callCount;
				await setState(adapter, `scenes.refreshScenes`, true, disposalMap, false);
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
				await disposalMap.disposeAll();
			}
		});

		it(`should have disposables after creating the scenes`, async function () {
			const disposalMap = new DisposalMap();
			await SetupScenes.createScenesAsync(adapter as unknown as ioBroker.Adapter, mockScenes, disposalMap);
			try {
				expect(disposalMap.size).to.be.not.equal(0);
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it(`should have no pending disposables for scene 0 after deleting the last scene`, async function () {
			adapter.getChannelsOf.callsFake(
				(_parentDevice: string, callback: ioBroker.GetObjectsCallback3<ioBroker.ChannelObject>) =>
					callback(null, [
						{
							_id: `${adapter.namespace}.scenes.${mockScene.SceneID}`,
							type: "channel",
							common: {
								name: mockScene.SceneName,
							},
							native: {},
						},
					] as ioBroker.ChannelObject[]),
			);
			const disposalMap = new DisposalMap();
			await SetupScenes.createScenesAsync(adapter as unknown as ioBroker.Adapter, mockScenes, disposalMap);
			try {
				mockScenes = await Scenes.createScenesAsync(mockConnection);
				sandbox.stub(mockScenes, "Scenes").value([]);
				await SetupScenes.createScenesAsync(adapter as unknown as ioBroker.Adapter, mockScenes, disposalMap);
				const remainingEntries: string[] = [];
				for (const key of disposalMap.keys()) {
					if (key.startsWith("scenes.0")) {
						remainingEntries.push(key);
					}
				}
				expect(
					remainingEntries.length,
					`disposalMap should be empty for scenes.0, but has the following entries: ${JSON.stringify(Array.from(disposalMap.keys()))}`,
				).to.be.equal(0);
			} finally {
				await disposalMap.disposeAll();
			}
		});
	});
});
