import { utils } from "@iobroker/testing";
import { use } from "chai";
import { Setup } from "./setup";
import sinon = require("sinon");
import sinonChai = require("sinon-chai");
import chaiAsPromised = require("chai-as-promised");

use(sinonChai);
use(chaiAsPromised);

describe("Setup", function () {
	// Create mocks and asserts
	const { adapter, database } = utils.unit.createMocks({});
	const { assertObjectExists } = utils.unit.createAsserts(database, adapter);

	afterEach(() => {
		// The mocks keep track of all method invocations - reset them after each single test
		adapter.resetMockHistory();
		// We want to start each test with a fresh database
		database.clear();
	});

	describe(`setupGlobalAsync`, function () {
		for (const deviceName of ["products", "scenes", "groups"]) {
			it(`should generate ${deviceName} device`, async function () {
				await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
				assertObjectExists(`${deviceName}`);
			});

			it(`shouldn't throw if ${deviceName} device already exists`, async function () {
				await adapter.setObjectNotExistsAsync(`${deviceName}`, {
					type: "device",
					common: {
						name: `${deviceName}`,
					},
					native: {},
				});
				return Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter).should.be.fulfilled;
			});

			it(`should generate ${deviceName}Found state`, async function () {
				await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
				assertObjectExists(`${deviceName}.${deviceName}Found`);
			});
		}

		it(`should generate gateway device`, async function () {
			await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
			assertObjectExists(`gateway`);
		});

		it(`shouldn't throw if gateway device already exists`, async function () {
			await adapter.setObjectNotExistsAsync(`gateway`, {
				type: "device",
				common: {
					name: `gateway`,
				},
				native: {},
			});
			return Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter).should.be.fulfilled;
		});

		it(`should generate gateway ProtocolVersion state`, async function () {
			await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
			assertObjectExists(`gateway.ProtocolVersion`);
		});

		it(`should generate gateway Version state`, async function () {
			await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
			assertObjectExists(`gateway.Version`);
		});

		it(`should generate gateway GatewayState`, async function () {
			await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
			assertObjectExists(`gateway.GatewayState`);
		});

		it(`should generate gateway GatewaySubState`, async function () {
			await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
			assertObjectExists(`gateway.GatewaySubState`);
		});
	});
});
