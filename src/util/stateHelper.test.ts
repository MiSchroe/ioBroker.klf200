import { utils } from "@iobroker/testing";
import { use } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinonChai from "sinon-chai";
import { StateHelper } from "./stateHelper";

use(sinonChai);
use(chaiAsPromised);

describe("StateHelper", function () {
	// Create mocks and asserts
	const { adapter, database } = utils.unit.createMocks({});

	const { assertObjectExists, assertStateHasValue, assertStateIsAcked } = utils.unit.createAsserts(database, adapter);

	afterEach(() => {
		// The mocks keep track of all method invocations - reset them after each single test
		adapter.resetMockHistory();
		// We want to start each test with a fresh database
		database.clear();
	});

	describe(`createAndSetStateAsync`, function () {
		const testStateId = "products.42.level";
		const testStateValue = 50;

		it(`should generate state ${testStateId}`, async function () {
			await StateHelper.createAndSetStateAsync(
				adapter as unknown as ioBroker.Adapter,
				testStateId,
				{
					name: "level",
					role: "window",
					type: "number",
					read: true,
					write: true,
					min: 0,
					max: 100,
					unit: "%",
					desc: "Opening level in percent",
				},
				{},
				testStateValue,
			);
			assertObjectExists(`test.0.${testStateId}`);
		});

		it(`state ${testStateId} should have value ${testStateValue}`, async function () {
			await StateHelper.createAndSetStateAsync(
				adapter as unknown as ioBroker.Adapter,
				testStateId,
				{
					name: "level",
					role: "window",
					type: "number",
					read: true,
					write: true,
					min: 0,
					max: 100,
					unit: "%",
					desc: "Opening level in percent",
				},
				{},
				testStateValue,
			);
			assertStateHasValue(`test.0.${testStateId}`, testStateValue);
		});

		it(`state ${testStateId} should be acknowledged`, async function () {
			await StateHelper.createAndSetStateAsync(
				adapter as unknown as ioBroker.Adapter,
				testStateId,
				{
					name: "level",
					role: "window",
					type: "number",
					read: true,
					write: true,
					min: 0,
					max: 100,
					unit: "%",
					desc: "Opening level in percent",
				},
				{},
				testStateValue,
			);
			assertStateIsAcked(`test.0.${testStateId}`, true);
		});
	});
});
