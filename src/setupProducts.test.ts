import { type MockAdapter, utils } from "@iobroker/testing";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
	ActuatorType,
	type Disposable,
	GW_GET_ALL_NODES_INFORMATION_NTF,
	type IConnection,
	type KLF200SocketProtocol,
	NodeOperatingState,
	NodeVariation,
	ParameterActive,
	PowerSaveMode,
	Product,
	RunStatus,
	StatusReply,
	Velocity,
} from "klf-200-api";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import type { EventEmitter } from "stream";
import { promisify } from "util";
import { DisposalMap } from "./disposalMap.js";
import { SetupProducts } from "./setupProducts.js";
import { BaseStateChangeHandler, SimplePropertyChangedHandler } from "./util/propertyLink.js";
import { StateHelper } from "./util/stateHelper.js";

use(sinonChai);
use(chaiAsPromised);

class MockConnect implements IConnection {
	onFrameSent = sinon.stub();
	loginAsync = sinon.stub();
	logoutAsync = sinon.stub();
	sendFrameAsync = sinon.stub();
	on = sinon.stub();
	KLF200SocketProtocol?: KLF200SocketProtocol = undefined;
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

	describe("createProductAsync", function () {
		it("should create the channel for product ID 0", async function () {
			const disposalMap = new DisposalMap();
			await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
				disposalMap,
				new Set<string>(),
			);
			try {
				assertObjectExists("products.0");
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it("should have the name 'Fenster Badezimmer' for its channel name", async function () {
			const expectedName = "Fenster Badezimmer";
			const disposalMap = new DisposalMap();
			await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
				disposalMap,
				new Set<string>(),
			);
			try {
				assertObjectCommon("products.0", { name: expectedName });
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it("should have the role 'window' for its channel role", async function () {
			const expectedName = "Fenster Badezimmer";
			const expectedRole = "window";
			const disposalMap = new DisposalMap();
			await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
				disposalMap,
				new Set<string>(),
			);
			try {
				assertObjectCommon("products.0", { name: expectedName, role: expectedRole });
			} finally {
				await disposalMap.disposeAll();
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
				state: "refreshProduct",
				value: false,
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
			{
				state: "limitationMPMinRaw",
				value: 0x0000,
			},
			{
				state: "limitationMPMaxRaw",
				value: 0xc800,
			},
			{
				state: "limitationMPMin",
				value: 100,
			},
			{
				state: "limitationMPMax",
				value: 0,
			},
			{
				state: "limitationMPOriginator",
				value: 1,
			},
			{
				state: "limitationMPOriginatorMin",
				value: 1,
			},
			{
				state: "limitationMPOriginatorMax",
				value: 1,
			},
			{
				state: "limitationMPTimeRaw",
				value: 253,
			},
			{
				state: "limitationMPTimeRawMin",
				value: 253,
			},
			{
				state: "limitationMPTimeRawMax",
				value: 253,
			},
			{
				state: "limitationMPTime",
				value: Infinity,
			},
			{
				state: "limitationMPTimeMin",
				value: Infinity,
			},
			{
				state: "limitationMPTimeMax",
				value: Infinity,
			},
			{
				state: "limitationFP1MinRaw",
				value: 0x0000,
			},
			{
				state: "limitationFP1MaxRaw",
				value: 0xc800,
			},
			{
				state: "limitationFP1Min",
				value: 100,
			},
			{
				state: "limitationFP1Max",
				value: 0,
			},
			{
				state: "limitationFP1Originator",
				value: 1,
			},
			{
				state: "limitationFP1OriginatorMin",
				value: 1,
			},
			{
				state: "limitationFP1OriginatorMax",
				value: 1,
			},
			{
				state: "limitationFP1TimeRaw",
				value: 253,
			},
			{
				state: "limitationFP1TimeRawMin",
				value: 253,
			},
			{
				state: "limitationFP1TimeRawMax",
				value: 253,
			},
			{
				state: "limitationFP1Time",
				value: Infinity,
			},
			{
				state: "limitationFP1TimeMin",
				value: Infinity,
			},
			{
				state: "limitationFP1TimeMax",
				value: Infinity,
			},
			{
				state: "limitationFP2MinRaw",
				value: 0x0000,
			},
			{
				state: "limitationFP2MaxRaw",
				value: 0xc800,
			},
			{
				state: "limitationFP2Min",
				value: 100,
			},
			{
				state: "limitationFP2Max",
				value: 0,
			},
			{
				state: "limitationFP2Originator",
				value: 1,
			},
			{
				state: "limitationFP2OriginatorMin",
				value: 1,
			},
			{
				state: "limitationFP2OriginatorMax",
				value: 1,
			},
			{
				state: "limitationFP2TimeRaw",
				value: 253,
			},
			{
				state: "limitationFP2TimeRawMin",
				value: 253,
			},
			{
				state: "limitationFP2TimeRawMax",
				value: 253,
			},
			{
				state: "limitationFP2Time",
				value: Infinity,
			},
			{
				state: "limitationFP2TimeMin",
				value: Infinity,
			},
			{
				state: "limitationFP2TimeMax",
				value: Infinity,
			},
			{
				state: "limitationFP3MinRaw",
				value: 0x0000,
			},
			{
				state: "limitationFP3MaxRaw",
				value: 0xc800,
			},
			{
				state: "limitationFP3Min",
				value: 100,
			},
			{
				state: "limitationFP3Max",
				value: 0,
			},
			{
				state: "limitationFP3Originator",
				value: 1,
			},
			{
				state: "limitationFP3OriginatorMin",
				value: 1,
			},
			{
				state: "limitationFP3OriginatorMax",
				value: 1,
			},
			{
				state: "limitationFP3TimeRaw",
				value: 253,
			},
			{
				state: "limitationFP3TimeRawMin",
				value: 253,
			},
			{
				state: "limitationFP3TimeRawMax",
				value: 253,
			},
			{
				state: "limitationFP3Time",
				value: Infinity,
			},
			{
				state: "limitationFP3TimeMin",
				value: Infinity,
			},
			{
				state: "limitationFP3TimeMax",
				value: Infinity,
			},
			{
				state: "limitationFP4MinRaw",
				value: 0x0000,
			},
			{
				state: "limitationFP4MaxRaw",
				value: 0xc800,
			},
			{
				state: "limitationFP4Min",
				value: 100,
			},
			{
				state: "limitationFP4Max",
				value: 0,
			},
			{
				state: "limitationFP4Originator",
				value: 1,
			},
			{
				state: "limitationFP4OriginatorMin",
				value: 1,
			},
			{
				state: "limitationFP4OriginatorMax",
				value: 1,
			},
			{
				state: "limitationFP4TimeRaw",
				value: 253,
			},
			{
				state: "limitationFP4TimeRawMin",
				value: 253,
			},
			{
				state: "limitationFP4TimeRawMax",
				value: 253,
			},
			{
				state: "limitationFP4Time",
				value: Infinity,
			},
			{
				state: "limitationFP4TimeMin",
				value: Infinity,
			},
			{
				state: "limitationFP4TimeMax",
				value: Infinity,
			},
			{
				state: "refreshLimitation",
				value: false,
			},
		];
		for (const test of testCases) {
			it(`should create the ${test.state} state object`, async function () {
				const expectedState = test.state;
				const disposalMap = new DisposalMap();
				await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
					disposalMap,
					new Set<string>(),
				);
				try {
					assertObjectExists(`test.0.products.0.${expectedState}`);
				} finally {
					await disposalMap.disposeAll();
				}
			});

			it(`should write the ${test.state} state`, async function () {
				const expectedState = test.state;
				const disposalMap = new DisposalMap();
				await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
					disposalMap,
					new Set<string>(),
				);
				try {
					assertStateExists(`test.0.products.0.${expectedState}`);
				} finally {
					await disposalMap.disposeAll();
				}
			});

			it(`should write the ${test.state} state with '${test.value}'`, async function () {
				const expectedState = test.state;
				const disposalMap = new DisposalMap();
				await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
					disposalMap,
					new Set<string>(),
				);
				try {
					assertStateHasValue(`test.0.products.0.${expectedState}`, test.value);
				} finally {
					await disposalMap.disposeAll();
				}
			});

			it(`should write the ${test.state} state ack`, async function () {
				const expectedState = test.state;
				const disposalMap = new DisposalMap();
				await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
					disposalMap,
					new Set<string>(),
				);
				try {
					assertStateIsAcked(`test.0.products.0.${expectedState}`, true);
				} finally {
					await disposalMap.disposeAll();
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
			let disposalMap: DisposalMap;
			this.beforeEach(async function () {
				disposalMap = new DisposalMap();
				await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
					disposalMap,
					new Set<string>(),
				);
			});
			this.afterEach(async function () {
				await disposalMap.disposeAll();
			});

			it(`should write the ${test.state} state with '${
				test.expectedValue ?? test.value
			}' after change notificiation`, async function () {
				const expectedState = test.state;
				await mockProduct.propertyChangedEvent.emit({
					o: mockProduct,
					propertyName: test.propertyName,
					propertyValue: test.value,
				});
				assertStateHasValue(`test.0.products.0.${expectedState}`, test.expectedValue ?? test.value);
			});

			it(`should write the ${test.state} state ack after change notificiation`, async function () {
				const expectedState = test.state;
				await mockProduct.propertyChangedEvent.emit({
					o: mockProduct,
					propertyName: test.propertyName,
					propertyValue: test.value,
				});
				assertStateIsAcked(`test.0.products.0.${expectedState}`, true);
			});
		}

		it(`Each writable state should be bound to a state change handler`, async function () {
			const disposalMap = new DisposalMap();
			await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
				disposalMap,
				new Set<string>(),
			);
			try {
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = (await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.products.${mockProduct.NodeID}.`,
					endkey: `${adapter.namespace}.products.${mockProduct.NodeID}.\u9999`,
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
			await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
				disposalMap,
				new Set<string>(),
			);
			try {
				const allowedUnmappedStates = [
					"test.0.products.0.category",
					"test.0.products.0.powerSaveMode",
					"test.0.products.0.productType",
					"test.0.products.0.serialNumber",
					"test.0.products.0.subType",
					"test.0.products.0.typeID",
					"test.0.products.0.velocity",
					"test.0.products.0.limitationMPMinRaw",
					"test.0.products.0.limitationMPMaxRaw",
					"test.0.products.0.limitationMPMin",
					"test.0.products.0.limitationMPMax",
					"test.0.products.0.limitationMPOriginator",
					"test.0.products.0.limitationMPOriginatorMin",
					"test.0.products.0.limitationMPOriginatorMax",
					"test.0.products.0.limitationMPTimeRaw",
					"test.0.products.0.limitationMPTimeRawMin",
					"test.0.products.0.limitationMPTimeRawMax",
					"test.0.products.0.limitationMPTime",
					"test.0.products.0.limitationMPTimeMin",
					"test.0.products.0.limitationMPTimeMax",
					"test.0.products.0.limitationFP1MinRaw",
					"test.0.products.0.limitationFP1MaxRaw",
					"test.0.products.0.limitationFP1Min",
					"test.0.products.0.limitationFP1Max",
					"test.0.products.0.limitationFP1Originator",
					"test.0.products.0.limitationFP1OriginatorMin",
					"test.0.products.0.limitationFP1OriginatorMax",
					"test.0.products.0.limitationFP1TimeRaw",
					"test.0.products.0.limitationFP1TimeRawMin",
					"test.0.products.0.limitationFP1TimeRawMax",
					"test.0.products.0.limitationFP1Time",
					"test.0.products.0.limitationFP1TimeMin",
					"test.0.products.0.limitationFP1TimeMax",
					"test.0.products.0.limitationFP2MinRaw",
					"test.0.products.0.limitationFP2MaxRaw",
					"test.0.products.0.limitationFP2Min",
					"test.0.products.0.limitationFP2Max",
					"test.0.products.0.limitationFP2Originator",
					"test.0.products.0.limitationFP2OriginatorMin",
					"test.0.products.0.limitationFP2OriginatorMax",
					"test.0.products.0.limitationFP2TimeRaw",
					"test.0.products.0.limitationFP2TimeRawMin",
					"test.0.products.0.limitationFP2TimeRawMax",
					"test.0.products.0.limitationFP2Time",
					"test.0.products.0.limitationFP2TimeMin",
					"test.0.products.0.limitationFP2TimeMax",
					"test.0.products.0.limitationFP3MinRaw",
					"test.0.products.0.limitationFP3MaxRaw",
					"test.0.products.0.limitationFP3Min",
					"test.0.products.0.limitationFP3Max",
					"test.0.products.0.limitationFP3Originator",
					"test.0.products.0.limitationFP3OriginatorMin",
					"test.0.products.0.limitationFP3OriginatorMax",
					"test.0.products.0.limitationFP3TimeRaw",
					"test.0.products.0.limitationFP3TimeRawMin",
					"test.0.products.0.limitationFP3TimeRawMax",
					"test.0.products.0.limitationFP3Time",
					"test.0.products.0.limitationFP3TimeMin",
					"test.0.products.0.limitationFP3TimeMax",
					"test.0.products.0.limitationFP4MinRaw",
					"test.0.products.0.limitationFP4MaxRaw",
					"test.0.products.0.limitationFP4Min",
					"test.0.products.0.limitationFP4Max",
					"test.0.products.0.limitationFP4Originator",
					"test.0.products.0.limitationFP4OriginatorMin",
					"test.0.products.0.limitationFP4OriginatorMax",
					"test.0.products.0.limitationFP4TimeRaw",
					"test.0.products.0.limitationFP4TimeRawMin",
					"test.0.products.0.limitationFP4TimeRawMax",
					"test.0.products.0.limitationFP4Time",
					"test.0.products.0.limitationFP4TimeMin",
					"test.0.products.0.limitationFP4TimeMax",
				];
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = (await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.products.${mockProduct.NodeID}.`,
					endkey: `${adapter.namespace}.products.${mockProduct.NodeID}.\u9999`,
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

		it("should call setTargetPositionAsync without functional parameters", async function () {
			const mock = sinon.mock(mockProduct);
			mock.expects("setTargetPositionAsync")
				.once()
				.withExactArgs(0.5, undefined, undefined, undefined, undefined);

			const disposalMap = new DisposalMap();
			await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
				disposalMap,
				new Set<string>(),
			);

			// Find the handler:
			const stateId = `products.${mockProduct.NodeID}.targetPosition`;
			const handler = disposalMap.get(stateId) as BaseStateChangeHandler;

			try {
				await handler?.onStateChange({
					val: 50,
					ack: false,
					from: stateId,
					lc: Date.now(),
					ts: Date.now(),
				});

				// Just let the asynchronous stuff run before our checks
				await new Promise(resolve => {
					setTimeout(resolve, 0);
				});

				mock.verify();
			} finally {
				await disposalMap.disposeAll();
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

			const disposalMap = new DisposalMap();
			await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
				disposalMap,
				new Set<string>(),
			);

			// Find the handler:
			const stateId = `products.${mockProduct.NodeID}.targetPosition`;
			const handler = disposalMap.get(stateId) as BaseStateChangeHandler;

			try {
				await adapter.setState(`products.${mockProduct.NodeID}.targetFP2Raw`, 42);
				await handler?.onStateChange({
					val: 50,
					ack: false,
					from: stateId,
					lc: Date.now(),
					ts: Date.now(),
				});

				// Just let the asynchronous stuff run before our checks
				await new Promise(resolve => {
					setTimeout(resolve, 0);
				});

				mock.verify();
			} finally {
				await disposalMap.disposeAll();
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

			const disposalMap = new DisposalMap();
			await SetupProducts.createProductAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProduct,
				disposalMap,
				new Set<string>(),
			);
			try {
				assertObjectExists(`test.0.products.0.${expectedState}`);
				assertObjectCommon(`test.0.products.0.${expectedState}`, { write: true } as ioBroker.StateCommon);
			} finally {
				await disposalMap.disposeAll();
			}
		});

		for (const expectedState of [
			"limitationFP1MinRaw",
			"limitationFP1MaxRaw",
			"limitationFP1Min",
			"limitationFP1Max",
			"limitationFP1Originator",
			"limitationFP1OriginatorMin",
			"limitationFP1OriginatorMax",
			"limitationFP1TimeRaw",
			"limitationFP1TimeRawMin",
			"limitationFP1TimeRawMax",
			"limitationFP1Time",
			"limitationFP1TimeMin",
			"limitationFP1TimeMax",
		]) {
			it(`shouldn't create a state for ${expectedState} of FP1`, async function () {
				const disposalMap = new DisposalMap();
				await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
					disposalMap,
					new Set<string>([JSON.stringify([0, ParameterActive.FP1])]),
				);
				try {
					expect(database.hasObject(`test.0.products.0.${expectedState}`)).to.be.false;
				} finally {
					await disposalMap.disposeAll();
				}
			});

			it(`shouldn't remove an existing state for ${expectedState} of FP1`, async function () {
				database.publishState(`test.0.products.0.${expectedState}`, {});
				assertObjectExists(`test.0.products.0.${expectedState}`);

				const disposalMap = new DisposalMap();
				await SetupProducts.createProductAsync(
					adapter as unknown as ioBroker.Adapter,
					mockProduct,
					disposalMap,
					new Set<string>([JSON.stringify([0, ParameterActive.FP1])]),
				);
				try {
					expect(database.hasObject(`test.0.products.0.${expectedState}`)).to.be.false;
				} finally {
					await disposalMap.disposeAll();
				}
			});
		}
	});

	describe("createProductsAsync", function () {
		it("should have 1 in the value of products.productsFound state", async function () {
			adapter.getChannelsOf.callsFake(
				(_parentDevice: string, callback: ioBroker.GetObjectsCallback3<ioBroker.ChannelObject>) =>
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

			const expectedValue = 1;
			const disposalMap = new DisposalMap();
			await SetupProducts.createProductsAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProducts,
				disposalMap,
				new Set<string>(),
			);
			try {
				assertStateHasValue("products.productsFound", expectedValue);
			} finally {
				await disposalMap.disposeAll();
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
				...states.map(state => {
					return { _id: `${adapter.namespace}.products.42.${state}` } as ioBroker.PartialObject;
				}),
			);

			// Check, that old states exist
			states.forEach(state => assertObjectExists(`${adapter.namespace}.products.42.${state}`));

			adapter.getChannelsOf.callsFake(
				(_parentDevice: string, callback: ioBroker.GetObjectsCallback3<ioBroker.ChannelObject>) =>
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

			const disposalMap = new DisposalMap();
			await SetupProducts.createProductsAsync(
				adapter as unknown as ioBroker.Adapter,
				mockProducts,
				disposalMap,
				new Set<string>(),
			);
			try {
				states.forEach(state =>
					expect(
						() => assertObjectExists(`${adapter.namespace}.products.42.${state}`),
						`Object ${adapter.namespace}.products.42.${state} shouldn't exist anymore.`,
					).to.throw(),
				);
			} finally {
				await disposalMap.disposeAll();
			}
		});
	});
});
