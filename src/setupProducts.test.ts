import { MockAdapter, utils } from "@iobroker/testing";
import { use } from "chai";
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

const mockProduct = new Product(
	mockConnection,
	new GW_GET_ALL_NODES_INFORMATION_NTF(
		Buffer.from([
			0x7f,
			0x02,
			0x04,
			0x00,
			0x00,
			0x00,
			0x01,
			0x46,
			0x65,
			0x6e,
			0x73,
			0x74,
			0x65,
			0x72,
			0x20,
			0x42,
			0x61,
			0x64,
			0x65,
			0x7a,
			0x69,
			0x6d,
			0x6d,
			0x65,
			0x72,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x01,
			0x01,
			0x01,
			0xd5,
			0x07,
			0x00,
			0x01,
			0x16,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x05,
			0xc8,
			0x00,
			0xc8,
			0x00,
			0xf7,
			0xff,
			0xf7,
			0xff,
			0xf7,
			0xff,
			0xf7,
			0xff,
			0x00,
			0x00,
			0x4f,
			0x00,
			0x3f,
			0xf3,
			0x01,
			0xd8,
			0x03,
			0xb2,
			0x1c,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
		]),
	),
);

const mockProducts = [mockProduct];

describe("setupProducts", function () {
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

	describe("createProductAsync", function () {
		it("should create the channel for product ID 0", async function () {
			const disposables = await SetupProducts.createProductAsync(
				(adapter as unknown) as ioBroker.Adapter,
				mockProduct,
			);
			try {
				assertObjectExists("products.0");
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		it("should have the name 'Fenster Badezimmer' for its channel name", async function () {
			const expectedName = "Fenster Badezimmer";
			const disposables = await SetupProducts.createProductAsync(
				(adapter as unknown) as ioBroker.Adapter,
				mockProduct,
			);
			try {
				assertObjectCommon("products.0", { name: expectedName });
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		it("should have the role 'window' for its channel role", async function () {
			const expectedName = "Fenster Badezimmer";
			const expectedRole = "window";
			const disposables = await SetupProducts.createProductAsync(
				(adapter as unknown) as ioBroker.Adapter,
				mockProduct,
			);
			try {
				assertObjectCommon("products.0", { name: expectedName, role: expectedRole });
			} finally {
				for (const disposable of await disposables) {
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
				state: "level",
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
				value: 0xd507,
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
				value: "16:00:00:00:00:00:00:00",
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
		];
		for (const test of testCases) {
			it(`should create the ${test.state} state object`, async function () {
				const expectedState = test.state;
				const disposables = await SetupProducts.createProductAsync(
					(adapter as unknown) as ioBroker.Adapter,
					mockProduct,
				);
				try {
					assertObjectExists(`test.0.products.0.${expectedState}`);
				} finally {
					for (const disposable of await disposables) {
						disposable.dispose();
					}
				}
			});

			it(`should write the ${test.state} state`, async function () {
				const expectedState = test.state;
				const disposables = await SetupProducts.createProductAsync(
					(adapter as unknown) as ioBroker.Adapter,
					mockProduct,
				);
				try {
					assertStateExists(`test.0.products.0.${expectedState}`);
				} finally {
					for (const disposable of await disposables) {
						disposable.dispose();
					}
				}
			});

			it(`should write the ${test.state} state with '${test.value}'`, async function () {
				const expectedState = test.state;
				const disposables = await SetupProducts.createProductAsync(
					(adapter as unknown) as ioBroker.Adapter,
					mockProduct,
				);
				try {
					assertStateHasValue(`test.0.products.0.${expectedState}`, test.value);
				} finally {
					for (const disposable of await disposables) {
						disposable.dispose();
					}
				}
			});

			it(`should write the ${test.state} state ack`, async function () {
				const expectedState = test.state;
				const disposables = await SetupProducts.createProductAsync(
					(adapter as unknown) as ioBroker.Adapter,
					mockProduct,
				);
				try {
					assertStateIsAcked(`test.0.products.0.${expectedState}`, true);
				} finally {
					for (const disposable of await disposables) {
						disposable.dispose();
					}
				}
			});
		}

		const testCasesForChanges = [
			{
				state: "level",
				propertyName: "CurrentPosition",
				value: 0.5,
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
					(adapter as unknown) as ioBroker.Adapter,
					mockProduct,
				);
			});
			this.afterEach(function () {
				for (const disposable of disposables) {
					disposable.dispose();
				}
				disposables.length = 0;
			});

			it(`should write the ${test.state} state with '${test.value}' after change notificiation`, function () {
				const expectedState = test.state;
				mockProduct.propertyChangedEvent.emit({
					o: mockProduct,
					propertyName: test.propertyName,
					propertyValue: test.value,
				});
				assertStateHasValue(`test.0.products.0.${expectedState}`, test.value);
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
	});

	describe("createProductsAsync", function () {
		it("should have 1 in the value of products.productsFound state", async function () {
			const expectedValue = 1;
			const disposables = await SetupProducts.createProductsAsync(
				(adapter as unknown) as ioBroker.Adapter,
				mockProducts,
			);
			try {
				assertStateHasValue("products.productsFound", expectedValue);
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});
	});
});
