import { MockAdapter, utils } from "@iobroker/testing";
import { expect, use } from "chai";
import {
	ActuatorType,
	GW_GET_ALL_NODES_INFORMATION_NTF,
	IConnection,
	NodeOperatingState,
	NodeVariation,
	PowerSaveMode,
	Product,
	RunStatus,
	StatusReply,
	Velocity,
} from "klf-200-api";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";
import { promisify } from "util";
import { SetupProducts } from "./setupProducts";
import { BaseStateChangeHandler, SimplePropertyChangedHandler } from "./util/propertyLink";
import { StateHelper } from "./util/stateHelper";
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

const mockProduct = new Product(
	mockConnection,
	new GW_GET_ALL_NODES_INFORMATION_NTF(
		Buffer.from([
			0x7f, 0x02, 0x04, 0x00, 0x00, 0x00, 0x01, 0x46, 0x65, 0x6e, 0x73, 0x74, 0x65, 0x72, 0x20, 0x42, 0x61, 0x64,
			0x65, 0x7a, 0x69, 0x6d, 0x6d, 0x65, 0x72, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
			0x01, 0x01, 0xd5, 0x07, 0x00, 0x01, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x05, 0xc8, 0x00,
			0xc8, 0x00, 0xf7, 0xff, 0xf7, 0xff, 0xf7, 0xff, 0xf7, 0xff, 0x00, 0x00, 0x4f, 0x00, 0x3f, 0xf3, 0x01, 0xd8,
			0x03, 0xb2, 0x1c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00,
		]),
	),
);

const mockProducts = [mockProduct];

describe("setupProducts", function () {
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

	describe("createProductAsync", function () {
		it("should create the channel for product ID 0", async function () {
			const disposables = await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
			);
			try {
				assertObjectExists("products.0");
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});

		it("should have the name 'Fenster Badezimmer' for its channel name", async function () {
			const expectedName = "Fenster Badezimmer";
			const disposables = await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
			);
			try {
				assertObjectCommon("products.0", { name: expectedName });
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});

		it("should have the role 'window' for its channel role", async function () {
			const expectedName = "Fenster Badezimmer";
			const expectedRole = "window";
			const disposables = await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
			);
			try {
				assertObjectCommon("products.0", { name: expectedName, role: expectedRole });
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});

		const testCases = [
			{
				state: "category",
				value: "Window opener with integrated rain sensor",
			},
			{
				state: "currentPosition",
				value: 0,
			},
			{
				state: "currentPositionRaw",
				value: 0xc800,
			},
			{
				state: "FP1CurrentPositionRaw",
				value: 0xf7ff,
			},
			{
				state: "FP2CurrentPositionRaw",
				value: 0xf7ff,
			},
			{
				state: "FP3CurrentPositionRaw",
				value: 0xf7ff,
			},
			{
				state: "FP4CurrentPositionRaw",
				value: 0xf7ff,
			},
			{
				state: "nodeVariation",
				value: NodeVariation.NotSet,
			},
			{
				state: "order",
				value: 0,
			},
			{
				state: "placement",
				value: 1,
			},
			{
				state: "powerSaveMode",
				value: PowerSaveMode.LowPowerMode,
			},
			{
				state: "productType",
				value: 0x07,
			},
			{
				state: "remainingTime",
				value: 0,
			},
			{
				state: "runStatus",
				value: RunStatus.ExecutionCompleted,
			},
			{
				state: "serialNumber",
				value: "00:00:00:00:00:00:00:00",
			},
			{
				state: "state",
				value: NodeOperatingState.Done,
			},
			{
				state: "statusReply",
				value: StatusReply.Unknown,
			},
			{
				state: "subType",
				value: 1,
			},
			{
				state: "targetPositionRaw",
				value: 0xc800,
			},
			// {
			// 	state: "timestamp",
			// 	value: new Date(new Date("Sun Jan 01 2012 12:13:55 GMT+0100 (GMT+01:00)").valueOf()),
			// },
			{
				state: "typeID",
				value: ActuatorType.WindowOpener,
			},
			{
				state: "velocity",
				value: Velocity.Silent,
			},
			{
				state: "stop",
				value: false,
			},
			{
				state: "wink",
				value: false,
			},
			{
				state: "targetFP1Raw",
				value: 0xd400,
			},
			{
				state: "targetFP2Raw",
				value: 0xd400,
			},
			{
				state: "targetFP3Raw",
				value: 0xd400,
			},
			{
				state: "targetFP4Raw",
				value: 0xd400,
			},
		];
		for (const test of testCases) {
			it(`should create the ${test.state} state object`, async function () {
				const expectedState = test.state;
				const disposables = await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
				);
				try {
					assertObjectExists(`test.0.products.0.${expectedState}`);
				} finally {
					for (const disposable of disposables) {
						disposable.dispose();
					}
				}
			});

			it(`should write the ${test.state} state`, async function () {
				const expectedState = test.state;
				const disposables = await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
				);
				try {
					assertStateExists(`test.0.products.0.${expectedState}`);
				} finally {
					for (const disposable of disposables) {
						disposable.dispose();
					}
				}
			});

			it(`should write the ${test.state} state with '${test.value}'`, async function () {
				const expectedState = test.state;
				const disposables = await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
				);
				try {
					assertStateHasValue(`test.0.products.0.${expectedState}`, test.value);
				} finally {
					for (const disposable of disposables) {
						disposable.dispose();
					}
				}
			});

			it(`should write the ${test.state} state ack`, async function () {
				const expectedState = test.state;
				const disposables = await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
				);
				try {
					assertStateIsAcked(`test.0.products.0.${expectedState}`, true);
				} finally {
					for (const disposable of disposables) {
						disposable.dispose();
					}
				}
			});
		}

		const testCasesForChanges = [
			{
				state: "targetPosition",
				propertyName: "TargetPosition",
				value: 0.5,
				expectedValue: 50,
			},
			{
				state: "currentPositionRaw",
				propertyName: "CurrentPositionRaw",
				value: 0xc900,
			},
			{
				state: "FP1CurrentPositionRaw",
				propertyName: "FP1CurrentPositionRaw",
				value: 0xc900,
			},
			{
				state: "FP2CurrentPositionRaw",
				propertyName: "FP2CurrentPositionRaw",
				value: 0xc900,
			},
			{
				state: "FP3CurrentPositionRaw",
				propertyName: "FP3CurrentPositionRaw",
				value: 0xc900,
			},
			{
				state: "FP4CurrentPositionRaw",
				propertyName: "FP4CurrentPositionRaw",
				value: 0xc900,
			},
			{
				state: "nodeVariation",
				propertyName: "NodeVariation",
				value: NodeVariation.Kip,
			},
			{
				state: "order",
				propertyName: "Order",
				value: 2,
			},
			{
				state: "placement",
				propertyName: "Placement",
				value: 1,
			},
			{
				state: "remainingTime",
				propertyName: "RemainingTime",
				value: 8,
			},
			{
				state: "runStatus",
				propertyName: "RunStatus",
				value: RunStatus.ExecutionActive,
			},
			{
				state: "state",
				propertyName: "State",
				value: NodeOperatingState.Executing,
			},
			{
				state: "statusReply",
				propertyName: "StatusReply",
				value: StatusReply.UserAction,
			},
			{
				state: "targetPositionRaw",
				propertyName: "TargetPositionRaw",
				value: 0xc900,
			},
		];

		for (const test of testCasesForChanges) {
			let disposables: Disposable[] = [];
			this.beforeEach(async function () {
				disposables = await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
				);
			});
			this.afterEach(function () {
				for (const disposable of disposables) {
					disposable.dispose();
				}
				disposables.length = 0;
			});

			it(`should write the ${test.state} state with '${
				test.expectedValue ?? test.value
			}' after change notificiation`, function () {
				const expectedState = test.state;
				mockProduct.propertyChangedEvent.emit({
					o: mockProduct,
					propertyName: test.propertyName,
					propertyValue: test.value,
				});
				assertStateHasValue(`test.0.products.0.${expectedState}`, test.expectedValue ?? test.value);
			});

			it(`should write the ${test.state} state ack after change notificiation`, async function () {
				const expectedState = test.state;
				mockProduct.propertyChangedEvent.emit({
					o: mockProduct,
					propertyName: test.propertyName,
					propertyValue: test.value,
				});
				assertStateIsAcked(`test.0.products.0.${expectedState}`, true);
			});
		}

		it(`Each writable state should be bound to a state change handler`, async function () {
			let disposables: Disposable[] = [];
			disposables = await SetupProducts.createProductAsync(adapter as unknown as ioBroker.Adapter, mockProduct);
			try {
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.products.${mockProduct.NodeID}.`,
					endkey: `${adapter.namespace}.products.${mockProduct.NodeID}.\u9999`,
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
			disposables = await SetupProducts.createProductAsync(adapter as unknown as ioBroker.Adapter, mockProduct);
			try {
				const allowedUnmappedStates = [
					"test.0.products.0.category",
					"test.0.products.0.powerSaveMode",
					"test.0.products.0.productType",
					"test.0.products.0.serialNumber",
					"test.0.products.0.subType",
					"test.0.products.0.typeID",
					"test.0.products.0.velocity",
				];
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.products.${mockProduct.NodeID}.`,
					endkey: `${adapter.namespace}.products.${mockProduct.NodeID}.\u9999`,
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

		it("should call setTargetPositionAsync without functional parameters", async function () {
			const mock = sinon.mock(mockProduct);
			mock.expects("setTargetPositionAsync")
				.once()
				.withExactArgs(0.5, undefined, undefined, undefined, undefined);

			const disposables = await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
			);

			// Find the handler:
			const stateId = `products.${mockProduct.NodeID}.targetPosition`;
			const handler = disposables.find(
				(disposable) => disposable instanceof BaseStateChangeHandler && disposable.StateId === stateId,
			) as BaseStateChangeHandler;

			try {
				await handler?.onStateChange({
					val: 50,
					ack: false,
					from: stateId,
					lc: Date.now(),
					ts: Date.now(),
				});

				// Just let the asynchronous stuff run before our checks
				await new Promise((resolve) => {
					setTimeout(resolve, 0);
				});

				mock.verify();
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});

		it("should call setTargetPositionAsync with functional parameters", async function () {
			const mock = sinon.mock(mockProduct);
			mock.expects("setTargetPositionAsync")
				.once()
				.withExactArgs(0.5, undefined, undefined, undefined, [
					{
						ID: 2,
						Value: 42,
					},
				]);

			const disposables = await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
			);

			// Find the handler:
			const stateId = `products.${mockProduct.NodeID}.targetPosition`;
			const handler = disposables.find(
				(disposable) => disposable instanceof BaseStateChangeHandler && disposable.StateId === stateId,
			) as BaseStateChangeHandler;

			try {
				await adapter.setStateAsync(`products.${mockProduct.NodeID}.targetFP2Raw`, 42);
				await handler?.onStateChange({
					val: 50,
					ack: false,
					from: stateId,
					lc: Date.now(),
					ts: Date.now(),
				});

				// Just let the asynchronous stuff run before our checks
				await new Promise((resolve) => {
					setTimeout(resolve, 0);
				});

				mock.verify();
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});

		it(`should change the setTargetPositionRawAsync state object to writable`, async function () {
			const expectedState = "targetPositionRaw";

			// Create the old state
			await StateHelper.createAndSetStateAsync(
				adapter as unknown as ioBroker.Adapter,
				`products.0.targetPositionRaw`,
				{
					name: "targetPositionRaw",
					role: "value",
					type: "number",
					read: true,
					write: false,
					min: 0,
					max: 0xffff,
					desc: "Target position raw value",
				},
				{},
				52100,
			);

			/* Double-check the value before */
			assertObjectExists(`test.0.products.0.${expectedState}`);
			assertObjectCommon(`test.0.products.0.${expectedState}`, { write: false } as ioBroker.StateCommon);

			const disposables = await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
			);
			try {
				assertObjectExists(`test.0.products.0.${expectedState}`);
				assertObjectCommon(`test.0.products.0.${expectedState}`, { write: true } as ioBroker.StateCommon);
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});
	});

	describe("createProductsAsync", function () {
		it("should have 1 in the value of products.productsFound state", async function () {
			const expectedValue = 1;
			const disposables = await SetupProducts.createProductsAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProducts,
			);
			try {
				assertStateHasValue("products.productsFound", expectedValue);
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});

		it(`should delete a product that doesn't exist anymore`, async function () {
			// Prepare objects and states
			database.publishDeviceObjects({
				_id: `${adapter.namespace}.products`,
			});
			database.publishChannelObjects({
				_id: `${adapter.namespace}.products.42`,
				common: {
					name: "Test window",
				},
			});
			const states: string[] = ["currentPosition", "targetPosition"];
			database.publishStateObjects(
				...states.map((state) => {
					return { _id: `${adapter.namespace}.products.42.${state}` } as ioBroker.PartialObject;
				}),
			);

			// Check, that old states exist
			states.forEach((state) => assertObjectExists(`${adapter.namespace}.products.42.${state}`));

			const disposables = await SetupProducts.createProductsAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProducts,
			);
			try {
				states.forEach((state) =>
					expect(
						() => assertObjectExists(`${adapter.namespace}.products.42.${state}`),
						`Object ${adapter.namespace}.products.42.${state} shouldn't exist anymore.`,
					).to.throw(),
				);
			} finally {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			}
		});
	});
});
