import { MockAdapter, utils } from "@iobroker/testing";
import { expect } from "chai";
import { Component } from "klf-200-api/dist/utils/PropertyChangedEvent";
import { promisify } from "util";
import {
	ComplexPropertyChangedHandler,
	ComplexStateChangeHandler,
	MapAnyPropertyToState,
	SimplePropertyChangedHandler,
	SimpleStateChangeHandler
} from "./propertyLink";
import sinon = require("sinon");

class TestComponent extends Component {
	private _BooleanValue = false;
	public get BooleanValue(): boolean {
		return this._BooleanValue;
	}
	public async setBooleanValueAsync(v: boolean): Promise<void> {
		if (this._BooleanValue !== v) {
			this._BooleanValue = v;
			this.propertyChanged("BooleanValue");
		}
	}

	private _NumberValue = 42;
	public get NumberValue(): number {
		return this._NumberValue;
	}
	public async setNumberValueAsync(v: number): Promise<void> {
		if (this._NumberValue !== v) {
			this._NumberValue = v;
			this.propertyChanged("NumberValue");
		}
	}

	private _StringValue = "42";
	public get StringValue(): string {
		return this._StringValue;
	}
	public async setStringValueAsync(v: string): Promise<void> {
		if (this._StringValue !== v) {
			this._StringValue = v;
			this.propertyChanged("StringValue");
		}
	}

	private _ArrayValue: string[] = ["abc", "def"];
	public get ArrayValue(): string[] {
		return this._ArrayValue;
	}
	public async setArrayValueAsync(v: string[]): Promise<void> {
		if (this._ArrayValue !== v) {
			this._ArrayValue = v;
			this.propertyChanged("ArrayValue");
		}
	}
}

describe("PropertyLink", function () {
	// Create mocks and asserts
	const { adapter, database } = utils.unit.createMocks({});
	const { assertStateHasValue, assertStateIsAcked } = utils.unit.createAsserts(database, adapter);

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

	const TestCases: { TestPropertyName: keyof TestComponent; ExpectedTypeName: string }[] = [
		{
			TestPropertyName: "BooleanValue",
			ExpectedTypeName: "boolean",
		},
		{
			TestPropertyName: "NumberValue",
			ExpectedTypeName: "number",
		},
		{
			TestPropertyName: "StringValue",
			ExpectedTypeName: "string",
		},
		{
			TestPropertyName: "ArrayValue",
			ExpectedTypeName: "string",
		},
	];

	for (const testCase of TestCases) {
		describe(`MapAnyPropertyToState with ${testCase.TestPropertyName}`, function () {
			it(`should return a ${testCase.ExpectedTypeName} value for the type of the return value`, function () {
				const testComponent = new TestComponent();
				const expectedResult = testCase.ExpectedTypeName;
				const result = typeof MapAnyPropertyToState<TestComponent>(testComponent[testCase.TestPropertyName]);
				expect(result).to.be.equal(expectedResult);
			});
		});
	}

	describe("SimplePropertyChangedHandler", function () {
		it("should set the state 'NumberValue' to 43 with ack.", async function () {
			// Setup state
			const stateID = "NumberValue";
			const testComponent = new TestComponent();
			const expectedResult = 43;
			await adapter.setObjectNotExistsAsync(stateID, {
				type: "state",
				common: {
					type: "number",
					min: 0,
					max: 100,
					read: true,
					write: true,
					role: "value",
					desc: "NumberValue",
				},
				native: {},
			});
			await adapter.setStateAsync(stateID, testComponent.NumberValue, true);

			const SUT = new SimplePropertyChangedHandler<TestComponent>(
				(adapter as unknown) as ioBroker.Adapter,
				stateID,
				"NumberValue",
				testComponent,
			);

			try {
				await testComponent.setNumberValueAsync(expectedResult);

				assertStateIsAcked(`test.0.${stateID}`, true);
				assertStateHasValue(`test.0.${stateID}`, expectedResult);
			} finally {
				SUT.dispose();
			}
		});
	});

	describe("ComplexPropertyChangedHandler", function () {
		it("should call the supplied handler function exactly once.", async function () {
			// Setup state
			const stateID = "NumberValue";
			const testComponent = new TestComponent();
			const expectedResult = 43;
			const handler = sinon.stub<[TestComponent[keyof TestComponent]], Promise<string>>();
			await adapter.setObjectNotExistsAsync(stateID, {
				type: "state",
				common: {
					type: "number",
					min: 0,
					max: 100,
					read: true,
					write: true,
					role: "value",
					desc: "NumberValue",
				},
				native: {},
			});
			await adapter.setStateAsync(stateID, testComponent.NumberValue, true);

			const SUT = new ComplexPropertyChangedHandler<TestComponent>(
				(adapter as unknown) as ioBroker.Adapter,
				"NumberValue",
				testComponent,
				handler,
			);

			try {
				await testComponent.setNumberValueAsync(expectedResult);

				expect(handler.calledOnceWithExactly(expectedResult)).to.be.true;
			} finally {
				SUT.dispose();
			}
		});
	});

	describe("SimpleStateChangeHandler", function () {
		const stateID = "NumberValue";
		const testComponent = new TestComponent();

		this.beforeEach(async () => {
			// Setup state
			await adapter.setObjectNotExistsAsync(stateID, {
				type: "state",
				common: {
					type: "number",
					min: 0,
					max: 100,
					read: true,
					write: true,
					role: "value",
					desc: "NumberValue",
				},
				native: {},
			});
			await adapter.setStateAsync(stateID, testComponent.NumberValue, true);
		});

		it.skip("should set the property 'NumberValue' to 43 when the adapter state is set.", async function () {
			const expectedResult = 43;

			const SUT = new SimpleStateChangeHandler<TestComponent>(
				(adapter as unknown) as ioBroker.Adapter,
				stateID,
				"NumberValue",
				testComponent,
			);
			try {
				await SUT.Initialize();

				await adapter.setStateAsync(stateID, expectedResult, false);
				adapter.stateChangeHandler!(stateID, {
					val: expectedResult,
					ack: false,
					ts: 12345,
					lc: 6789,
					from: `${adapter.namespace}`,
				});

				expect(testComponent.NumberValue).to.be.equal(expectedResult);
			} finally {
				await SUT.dispose();
			}
		});

		it.skip("should set the property 'NumberValue' to 43 when the adapter state is set with explicit setterMethodName.", async function () {
			const expectedResult = 43;

			const SUT = new SimpleStateChangeHandler<TestComponent>(
				(adapter as unknown) as ioBroker.Adapter,
				stateID,
				"NumberValue",
				testComponent,
				"setNumberValueAsync",
			);
			try {
				await SUT.Initialize();

				await adapter.setStateAsync(stateID, expectedResult, false);
				adapter.stateChangeHandler!(stateID, {
					val: expectedResult,
					ack: false,
					ts: 12345,
					lc: 6789,
					from: `${adapter.namespace}`,
				});

				expect(testComponent.NumberValue).to.be.equal(expectedResult);
			} finally {
				await SUT.dispose();
			}
		});
	});

	describe("ComplexStateChangeHandler", function () {
		const stateID = "NumberValue";
		const testComponent = new TestComponent();

		this.beforeEach(async () => {
			// Setup state
			await adapter.setObjectNotExistsAsync(stateID, {
				type: "state",
				common: {
					type: "number",
					min: 0,
					max: 100,
					read: true,
					write: true,
					role: "value",
					desc: "NumberValue",
				},
				native: {},
			});
			await adapter.setStateAsync(stateID, testComponent.NumberValue, true);
		});

		it.skip("should call the provided handly exaclty once.", async function () {
			const expectedResult = 43;

			const handler = sinon.stub<[ioBroker.State | null | undefined], Promise<void>>();
			const SUT = new ComplexStateChangeHandler<TestComponent>(
				(adapter as unknown) as ioBroker.Adapter,
				stateID,
				handler,
			);
			try {
				await SUT.Initialize();

				await adapter.setStateAsync(stateID, expectedResult, false);
				adapter.stateChangeHandler!(stateID, {
					val: expectedResult,
					ack: false,
					ts: 12345,
					lc: 6789,
					from: `${adapter.namespace}`,
				});

				expect(handler.calledOnce).to.be.true;
			} finally {
				await SUT.dispose();
			}
		});
	});
});
