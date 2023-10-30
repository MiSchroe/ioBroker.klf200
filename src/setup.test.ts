import { MockAdapter, utils } from "@iobroker/testing";
import { expect, use } from "chai";
import { Gateway, GatewayState, GatewaySubState, IConnection, SoftwareVersion } from "klf-200-api";
import { promisify } from "util";
import { Setup } from "./setup";
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

describe("Setup", function () {
	// Create mocks and asserts
	const { adapter, database } = utils.unit.createMocks({});
	const { assertObjectExists } = utils.unit.createAsserts(database, adapter);

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

	// Mock the gateway
	const mockGateway = new Gateway(mockConnection);

	sinon.stub(mockGateway, "getProtocolVersionAsync").callsFake(async () => {
		return { MajorVersion: 1, MinorVersion: 2 };
	});
	sinon.stub(mockGateway, "getStateAsync").callsFake(async () => {
		return { GatewayState: GatewayState.GatewayMode_WithActuatorNodes, SubState: GatewaySubState.Idle };
	});
	sinon.stub(mockGateway, "getVersionAsync").callsFake(async () => {
		return {
			SoftwareVersion: new SoftwareVersion(0, 2, 0, 0, 7, 1),
			HardwareVersion: 1,
			ProductGroup: 14,
			ProductType: 3,
		};
	});

	// Mock some EventEmitter functions
	(adapter as any).getMaxListeners = sinon.stub<[], number>().returns(100);
	(adapter as any).setMaxListeners = sinon.stub<[number], void>();

	afterEach(() => {
		// The mocks keep track of all method invocations - reset them after each single test
		adapter.resetMockHistory();
		// We want to start each test with a fresh database
		database.clear();
	});

	describe(`setupGlobalAsync`, function () {
		for (const deviceName of ["products", "scenes", "groups"]) {
			it(`should generate ${deviceName} device`, async function () {
				const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
				try {
					assertObjectExists(`${deviceName}`);
				} finally {
					setup.dispose();
				}
			});

			it(`shouldn't throw if ${deviceName} device already exists`, async function () {
				await adapter.setObjectNotExistsAsync(`${deviceName}`, {
					type: "device",
					common: {
						name: `${deviceName}`,
					},
					native: {},
				});
				const setup = Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
				try {
					return setup.should.be.fulfilled;
				} finally {
					(await setup).dispose();
				}
			});

			it(`should generate ${deviceName}Found state`, async function () {
				const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
				try {
					assertObjectExists(`${deviceName}.${deviceName}Found`);
				} finally {
					setup.dispose();
				}
			});
		}

		it(`should generate gateway device`, async function () {
			const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
			try {
				assertObjectExists(`gateway`);
			} finally {
				setup.dispose();
			}
		});

		it(`shouldn't throw if gateway device already exists`, async function () {
			await adapter.setObjectNotExistsAsync(`gateway`, {
				type: "device",
				common: {
					name: `gateway`,
				},
				native: {},
			});
			const setup = Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
			try {
				return setup.should.be.fulfilled;
			} finally {
				(await setup).dispose();
			}
		});

		it(`should generate gateway ProtocolVersion state`, async function () {
			const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
			try {
				assertObjectExists(`gateway.ProtocolVersion`);
			} finally {
				setup.dispose();
			}
		});

		it(`should generate gateway SoftwareVersion state`, async function () {
			const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
			try {
				assertObjectExists(`gateway.SoftwareVersion`);
			} finally {
				setup.dispose();
			}
		});

		it(`should generate gateway HardwareVersion state`, async function () {
			const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
			try {
				assertObjectExists(`gateway.HardwareVersion`);
			} finally {
				setup.dispose();
			}
		});

		it(`should generate gateway ProductGroup state`, async function () {
			const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
			try {
				assertObjectExists(`gateway.ProductGroup`);
			} finally {
				setup.dispose();
			}
		});

		it(`should generate gateway ProductType state`, async function () {
			const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
			try {
				assertObjectExists(`gateway.ProductType`);
			} finally {
				setup.dispose();
			}
		});

		it(`should generate gateway GatewayState`, async function () {
			const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
			try {
				assertObjectExists(`gateway.GatewayState`);
			} finally {
				setup.dispose();
			}
		});

		it(`should generate gateway GatewaySubState`, async function () {
			const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
			try {
				assertObjectExists(`gateway.GatewaySubState`);
			} finally {
				setup.dispose();
			}
		});

		it(`Each writable state should be bound to a state change handler`, async function () {
			const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);
			try {
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.gateway.`,
					endkey: `${adapter.namespace}.gateway.\u9999`,
				});
				const unmappedWritableStates = objectList.rows
					.map((value) => {
						// Find state in disposables (only for writable states)
						if (
							value.doc.type !== "state" ||
							value.doc.common.write === false ||
							adapter.subscribeStatesAsync.calledWith(value.id.replace("test.0.", ""))
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
				setup.dispose();
			}
		});

		it.skip(`Each readable state should be bound to a property change handler`, async function () {
			const setup = await Setup.setupGlobalAsync(adapter as unknown as ioBroker.Adapter, mockGateway);

			try {
				const allowedUnmappedStates: string[] = [
					"test.0.gateway.ProtocolVersion",
					"test.0.gateway.Version",
					"test.0.gateway.GatewayState",
					"test.0.gateway.GatewaySubState",
				];
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.gateway.`,
					endkey: `${adapter.namespace}.gateway.\u9999`,
				});
				const unmappedWritableStates = objectList.rows
					.map((value) => {
						// Find state in disposables (only for writable states)
						if (
							value.doc.type !== "state" ||
							value.doc.common.read === false ||
							allowedUnmappedStates.includes(value.id) ||
							false
							// disposables.some((disposable) => {
							// 	if (disposable instanceof SimplePropertyChangedHandler) {
							// 		return (
							// 			`${(adapter as unknown as ioBroker.Adapter).namespace}.${
							// 				disposable.StateId
							// 			}` === value.id
							// 		);
							// 	} else if (disposable instanceof ComplexPropertyChangedHandler) {
							// 		return complexStatesMapping[disposable.Property as string]?.includes(value.id);
							// 	} else if (allowedUnmappedStates.includes(value.id)) {
							// 		return true;
							// 	} else {
							// 		return false;
							// 	}
							// })
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
				setup.dispose();
			}
		});
	});
});
