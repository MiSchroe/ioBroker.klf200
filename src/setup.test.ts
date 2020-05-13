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
				const disposables = await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
				try {
					assertObjectExists(`${deviceName}`);
				} finally {
					for (const disposable of disposables) {
						disposable.dispose();
					}
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
				const disposables = Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
				try {
					return disposables.should.be.fulfilled;
				} finally {
					for (const disposable of await disposables) {
						disposable.dispose();
					}
				}
			});

			it(`should generate ${deviceName}Found state`, async function () {
				const disposables = await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
				try {
					assertObjectExists(`${deviceName}.${deviceName}Found`);
				} finally {
					for (const disposable of await disposables) {
						disposable.dispose();
					}
				}
			});
		}

		it(`should generate gateway device`, async function () {
			const disposables = await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
			try {
				assertObjectExists(`gateway`);
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
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
			const disposables = Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
			try {
				return disposables.should.be.fulfilled;
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		it(`should generate gateway ProtocolVersion state`, async function () {
			const disposables = await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
			try {
				assertObjectExists(`gateway.ProtocolVersion`);
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		it(`should generate gateway Version state`, async function () {
			const disposables = await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
			try {
				assertObjectExists(`gateway.Version`);
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		it(`should generate gateway GatewayState`, async function () {
			const disposables = await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
			try {
				assertObjectExists(`gateway.GatewayState`);
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});

		it(`should generate gateway GatewaySubState`, async function () {
			const disposables = await Setup.setupGlobalAsync((adapter as unknown) as ioBroker.Adapter);
			try {
				assertObjectExists(`gateway.GatewaySubState`);
			} finally {
				for (const disposable of await disposables) {
					disposable.dispose();
				}
			}
		});
	});
});
