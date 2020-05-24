import { MockAdapter, utils } from "@iobroker/testing";
import { use } from "chai";
import {
	Group,
	GroupType,
	GW_GET_ALL_NODES_INFORMATION_NTF,
	GW_GET_GROUP_INFORMATION_NTF,
	IConnection,
	NodeVariation,
	Product,
	Velocity,
} from "klf-200-api";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";
import { promisify } from "util";
import { SetupGroups } from "./setupGroups";
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

const mockGroup = new Group(
	mockConnection,
	new GW_GET_GROUP_INFORMATION_NTF(
		Buffer.from([
			0x00,
			0x02,
			0x30,
			0x32,
			0x00,
			0x00,
			0x00,
			0x54,
			0x65,
			0x73,
			0x74,
			0x20,
			0x47,
			0x72,
			0x6f,
			0x75,
			0x70,
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
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x01,
			0x02,
			0x00,
			0x02,
			0x03,
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
			0x12,
			0x34,
		]),
	),
);

const mockGroups = [mockGroup];

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

const mockProducts = [mockProduct, mockProduct];

describe("setupGroups", function () {
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

	describe("createGroupAsync", function () {
		it("should create the channel for Group ID 50", async function () {
			const disposables = await SetupGroups.createGroupAsync(
				(adapter as unknown) as ioBroker.Adapter,
				mockGroup,
				mockProducts,
			);
			try {
				assertObjectExists("groups.50");
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		it("should have the name 'Test Group' for its channel name", async function () {
			const expectedName = "Test Group";
			const disposables = await SetupGroups.createGroupAsync(
				(adapter as unknown) as ioBroker.Adapter,
				mockGroup,
				mockProducts,
			);
			try {
				assertObjectCommon("groups.50", { name: expectedName });
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		it("should have the role 'group.user' for its channel role", async function () {
			const expectedName = "Test Group";
			const expectedRole = "group.user";
			const disposables = await SetupGroups.createGroupAsync(
				(adapter as unknown) as ioBroker.Adapter,
				mockGroup,
				mockProducts,
			);
			try {
				assertObjectCommon("groups.50", { name: expectedName, role: expectedRole });
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
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
				const disposables = await SetupGroups.createGroupAsync(
					(adapter as unknown) as ioBroker.Adapter,
					mockGroup,
					mockProducts,
				);
				try {
					assertObjectExists(`test.0.groups.50.${expectedState}`);
				} finally {
					for (const disposable of await disposables) {
						disposable.dispose();
					}
				}
			});

			if (test.value !== undefined) {
				it(`should write the ${test.state} state`, async function () {
					const expectedState = test.state;
					const disposables = await SetupGroups.createGroupAsync(
						(adapter as unknown) as ioBroker.Adapter,
						mockGroup,
						mockProducts,
					);
					try {
						assertStateExists(`test.0.groups.50.${expectedState}`);
					} finally {
						for (const disposable of await disposables) {
							disposable.dispose();
						}
					}
				});

				it(`should write the ${test.state} state with '${test.value}'`, async function () {
					const expectedState = test.state;
					const disposables = await SetupGroups.createGroupAsync(
						(adapter as unknown) as ioBroker.Adapter,
						mockGroup,
						mockProducts,
					);
					try {
						assertStateHasValue(`test.0.groups.50.${expectedState}`, test.value);
					} finally {
						for (const disposable of await disposables) {
							disposable.dispose();
						}
					}
				});

				it(`should write the ${test.state} state ack`, async function () {
					const expectedState = test.state;
					const disposables = await SetupGroups.createGroupAsync(
						(adapter as unknown) as ioBroker.Adapter,
						mockGroup,
						mockProducts,
					);
					try {
						assertStateIsAcked(`test.0.groups.50.${expectedState}`, true);
					} finally {
						for (const disposable of await disposables) {
							disposable.dispose();
						}
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
			let disposables: Disposable[] = [];
			this.beforeEach(async function () {
				disposables = await SetupGroups.createGroupAsync(
					(adapter as unknown) as ioBroker.Adapter,
					mockGroup,
					mockProducts,
				);
			});
			this.afterEach(function () {
				for (const disposable of disposables) {
					disposable.dispose();
				}
			});

			it(`should write the ${test.state} state with '${test.value}' after change notificiation`, async function () {
				const expectedState = test.state;
				await ((adapter as unknown) as ioBroker.Adapter).setStateAsync(
					`groups.50.${test.state}`,
					test.value,
					false,
				);
				assertStateIsAcked(`test.0.groups.50.${expectedState}`, false);
				mockGroup.propertyChangedEvent.emit({
					o: mockGroup,
					propertyName: test.propertyName,
					propertyValue: test.value,
				});
				assertStateHasValue(`test.0.groups.50.${expectedState}`, test.value);
			});

			it(`should write the ${test.state} state ack after change notificiation`, async function () {
				const expectedState = test.state;
				await ((adapter as unknown) as ioBroker.Adapter).setStateAsync(
					`groups.50.${test.state}`,
					test.value,
					false,
				);
				assertStateIsAcked(`test.0.groups.50.${expectedState}`, false);
				mockGroup.propertyChangedEvent.emit({
					o: mockGroup,
					propertyName: test.propertyName,
					propertyValue: test.value,
				});
				assertStateIsAcked(`test.0.groups.50.${expectedState}`, true);
			});
		}
	});

	describe("createGroupsAsync", function () {
		it("should have 1 in the value of groups.groupsFound state", async function () {
			const expectedValue = 1;
			const disposables = await SetupGroups.createGroupsAsync(
				(adapter as unknown) as ioBroker.Adapter,
				mockGroups,
				mockProducts,
			);
			try {
				assertStateHasValue("groups.groupsFound", expectedValue);
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});
	});
});
