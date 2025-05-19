import { type MockAdapter, utils } from "@iobroker/testing";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
	type Disposable,
	GW_GET_ALL_NODES_INFORMATION_NTF,
	GW_GET_GROUP_INFORMATION_NTF,
	Group,
	GroupType,
	type IConnection,
	NodeVariation,
	Product,
	Velocity,
} from "klf-200-api";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import type { EventEmitter } from "stream";
import { promisify } from "util";
import { DisposalMap } from "./disposalMap";
import { SetupGroups } from "./setupGroups";
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

const mockGroup = new Group(
	mockConnection,
	new GW_GET_GROUP_INFORMATION_NTF(
		Buffer.from([
			0x00, 0x02, 0x30, 0x32, 0x00, 0x00, 0x00, 0x54, 0x65, 0x73, 0x74, 0x20, 0x47, 0x72, 0x6f, 0x75, 0x70, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
			0x02, 0x00, 0x02, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x12, 0x34,
		]),
	),
);

const mockGroups = [mockGroup];

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

const mockProducts = [mockProduct, mockProduct];

describe("setupGroups", function () {
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

	describe("createGroupAsync", function () {
		it("should create the channel for Group ID 50", async function () {
			const disposalMap = new DisposalMap();
			await SetupGroups.createGroupAsync(
				adapter as unknown as ioBroker.Adapter,
				mockGroup,
				mockProducts,
				disposalMap,
			);
			try {
				assertObjectExists("groups.50");
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it("should have the name 'Test Group' for its channel name", async function () {
			const expectedName = "Test Group";
			const disposalMap = new DisposalMap();
			await SetupGroups.createGroupAsync(
				adapter as unknown as ioBroker.Adapter,
				mockGroup,
				mockProducts,
				disposalMap,
			);
			try {
				assertObjectCommon("groups.50", { name: expectedName });
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it("should have the role 'group.user' for its channel role", async function () {
			const expectedName = "Test Group";
			const expectedRole = "group.user";
			const disposalMap = new DisposalMap();
			await SetupGroups.createGroupAsync(
				adapter as unknown as ioBroker.Adapter,
				mockGroup,
				mockProducts,
				disposalMap,
			);
			try {
				assertObjectCommon("groups.50", { name: expectedName, role: expectedRole });
			} finally {
				await disposalMap.disposeAll();
			}
		});

		const testCases = [
			{
				state: "productsCount",
				value: 2,
			},
			{
				state: "groupType",
				value: GroupType.UserGroup,
			},
			{
				state: "nodeVariation",
				value: NodeVariation.Kip,
			},
			{
				state: "order",
				value: 0,
			},
			{
				state: "placement",
				value: 0,
			},
			{
				state: "velocity",
				value: Velocity.Silent,
			},
			{
				state: "targetPosition",
			},
			{
				state: "targetPositionRaw",
			},
		];
		for (const test of testCases) {
			it(`should create the ${test.state} state object`, async function () {
				const expectedState = test.state;
				const disposalMap = new DisposalMap();
				await SetupGroups.createGroupAsync(
					adapter as unknown as ioBroker.Adapter,
					mockGroup,
					mockProducts,
					disposalMap,
				);
				try {
					assertObjectExists(`test.0.groups.50.${expectedState}`);
				} finally {
					await disposalMap.disposeAll();
				}
			});

			if (test.value !== undefined) {
				it(`should write the ${test.state} state`, async function () {
					const expectedState = test.state;
					const disposalMap = new DisposalMap();
					await SetupGroups.createGroupAsync(
						adapter as unknown as ioBroker.Adapter,
						mockGroup,
						mockProducts,
						disposalMap,
					);
					try {
						assertStateExists(`test.0.groups.50.${expectedState}`);
					} finally {
						await disposalMap.disposeAll();
					}
				});

				it(`should write the ${test.state} state with '${test.value}'`, async function () {
					const expectedState = test.state;
					const disposalMap = new DisposalMap();
					await SetupGroups.createGroupAsync(
						adapter as unknown as ioBroker.Adapter,
						mockGroup,
						mockProducts,
						disposalMap,
					);
					try {
						assertStateHasValue(`test.0.groups.50.${expectedState}`, test.value);
					} finally {
						await disposalMap.disposeAll();
					}
				});

				it(`should write the ${test.state} state ack`, async function () {
					const expectedState = test.state;
					const disposalMap = new DisposalMap();
					await SetupGroups.createGroupAsync(
						adapter as unknown as ioBroker.Adapter,
						mockGroup,
						mockProducts,
						disposalMap,
					);
					try {
						assertStateIsAcked(`test.0.groups.50.${expectedState}`, true);
					} finally {
						await disposalMap.disposeAll();
					}
				});
			}
		}

		const testCasesForChanges = [
			{
				state: "order",
				propertyName: "Order",
				value: 1,
			},
			{
				state: "placement",
				propertyName: "Placement",
				value: 1,
			},
			{
				state: "velocity",
				propertyName: "Velocity",
				value: Velocity.Fast,
			},
			{
				state: "nodeVariation",
				propertyName: "NodeVariation",
				value: NodeVariation.TopHung,
			},
			{
				state: "groupType",
				propertyName: "GroupType",
				value: GroupType.Room,
			},
		];

		for (const test of testCasesForChanges) {
			let disposalMap: DisposalMap;
			this.beforeEach(async function () {
				disposalMap = new DisposalMap();
				await SetupGroups.createGroupAsync(
					adapter as unknown as ioBroker.Adapter,
					mockGroup,
					mockProducts,
					disposalMap,
				);
			});
			this.afterEach(async function () {
				await disposalMap.disposeAll();
			});

			it(`should write the ${test.state} state with '${test.value}' after change notificiation`, async function () {
				const expectedState = test.state;
				await (adapter as unknown as ioBroker.Adapter).setState(`groups.50.${test.state}`, test.value, false);
				assertStateIsAcked(`test.0.groups.50.${expectedState}`, false);
				await mockGroup.propertyChangedEvent.emit({
					o: mockGroup,
					propertyName: test.propertyName,
					propertyValue: test.value,
				});
				assertStateHasValue(`test.0.groups.50.${expectedState}`, test.value);
			});

			it(`should write the ${test.state} state ack after change notificiation`, async function () {
				const expectedState = test.state;
				await (adapter as unknown as ioBroker.Adapter).setState(`groups.50.${test.state}`, test.value, false);
				assertStateIsAcked(`test.0.groups.50.${expectedState}`, false);
				await mockGroup.propertyChangedEvent.emit({
					o: mockGroup,
					propertyName: test.propertyName,
					propertyValue: test.value,
				});
				assertStateIsAcked(`test.0.groups.50.${expectedState}`, true);
			});
		}

		it(`Each writable state should be bound to a state change handler`, async function () {
			const disposalMap = new DisposalMap();
			await SetupGroups.createGroupAsync(
				adapter as unknown as ioBroker.Adapter,
				mockGroup,
				mockProducts,
				disposalMap,
			);
			try {
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = (await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.groups.${mockGroup.GroupID}.`,
					endkey: `${adapter.namespace}.groups.${mockGroup.GroupID}.\u9999`,
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
			await SetupGroups.createGroupsAsync(
				adapter as unknown as ioBroker.Adapter,
				mockGroups,
				mockProducts,
				disposalMap,
			);
			try {
				const allowedUnmappedStates: string[] = [];
				const complexStatesMapping: { [prop: string]: string[] } = {
					Nodes: ["test.0.groups.50.productsCount"],
				};
				const objectList: ioBroker.NonNullCallbackReturnTypeOf<
					ioBroker.GetObjectListCallback<ioBroker.Object>
				> = (await adapter.getObjectListAsync({
					startKey: `${adapter.namespace}.groups.${mockGroup.GroupID}.`,
					endkey: `${adapter.namespace}.groups.${mockGroup.GroupID}.\u9999`,
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
	});

	describe("createGroupsAsync", function () {
		it("should have 1 in the value of groups.groupsFound state", async function () {
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
			await SetupGroups.createGroupsAsync(
				adapter as unknown as ioBroker.Adapter,
				mockGroups,
				mockProducts,
				disposalMap,
			);
			try {
				assertStateHasValue("groups.groupsFound", expectedValue);
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it(`should delete a group that doesn't exist anymore`, async function () {
			// Prepare objects and states
			database.publishDeviceObjects({
				_id: `${adapter.namespace}.groups`,
			});
			database.publishChannelObjects({
				_id: `${adapter.namespace}.groups.42`,
				common: {
					name: "Test group",
				},
			});
			const states: string[] = ["groupType", "targetPosition"];
			database.publishStateObjects(
				...states.map(state => {
					return { _id: `${adapter.namespace}.groups.42.${state}` } as ioBroker.PartialObject;
				}),
			);

			// Check, that old states exist
			states.forEach(state => assertObjectExists(`${adapter.namespace}.groups.42.${state}`));

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
			await SetupGroups.createGroupsAsync(
				adapter as unknown as ioBroker.Adapter,
				mockGroups,
				mockProducts,
				disposalMap,
			);
			try {
				states.forEach(state =>
					expect(
						() => assertObjectExists(`${adapter.namespace}.groups.42.${state}`),
						`Object ${adapter.namespace}.groups.42.${state} shouldn't exist anymore.`,
					).to.throw(),
				);
			} finally {
				await disposalMap.disposeAll();
			}
		});
	});
});
