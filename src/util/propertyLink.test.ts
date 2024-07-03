import { MockAdapter, utils } from "@iobroker/testing";
import { expect } from "chai";
import { Component } from "klf-200-api";
import { promisify } from "util";
import { setState } from "../../test/mockHelper";
import { DisposalMap } from "../disposalMap";
import {
	ComplexPropertyChangedHandler,
	ComplexStateChangeHandler,
	MapAnyPropertyToState,
	MethodCallStateChangeHandler,
	SimplePropertyChangedHandler,
	SimpleStateChangeHandler,
} from "./propertyLink";
import { AsyncMethodParameters } from "./utils";
import sinon = require("sinon");

class TestComponent extends Component {
	private _BooleanValue = false;
	public get BooleanValue(): boolean {
		return this._BooleanValue;
	}
	public async setBooleanValueAsync(v: boolean): Promise<void> {
		if (this._BooleanValue !== v) {
			this._BooleanValue = v;
			await this.propertyChanged("BooleanValue");
		}
	}

	private _NumberValue = 42;
	public get NumberValue(): number {
		return this._NumberValue;
	}
	public async setNumberValueAsync(v: number): Promise<void> {
		if (this._NumberValue !== v) {
			this._NumberValue = v;
			await this.propertyChanged("NumberValue");
		}
	}

	private _StringValue = "42";
	public get StringValue(): string {
		return this._StringValue;
	}
	public async setStringValueAsync(v: string): Promise<void> {
		if (this._StringValue !== v) {
			this._StringValue = v;
			await this.propertyChanged("StringValue");
		}
	}

	private _ArrayValue: string[] = ["abc", "def"];
	public get ArrayValue(): string[] {
		return this._ArrayValue;
	}
	public async setArrayValueAsync(v: string[]): Promise<void> {
		if (this._ArrayValue !== v) {
			this._ArrayValue = v;
			await this.propertyChanged("ArrayValue");
		}
	}

	public async runAMethod(a: number, b: number, c: string): Promise<number> {
		return await Promise.resolve(a + b + c.length);
	}
}

describe("PropertyLink", function () {
	// Create mocks and asserts
	const { adapter, database } = utils.unit.createMocks({});
	// eslint-disable-next-line @typescript-eslint/unbound-method
	const { assertStateHasValue, assertStateIsAcked } = utils.unit.createAsserts(database, adapter);

	// Promisify additional methods
	for (const method of ["unsubscribeStates"]) {
		Object.defineProperty(adapter, `${method}Async`, {
			configurable: true,
			enumerable: true,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
			value: promisify(adapter[method as keyof MockAdapter]),
			writable: true,
		});
	}

	// Stub additional methods
	if (!adapter["getMaxListeners"]) {
		adapter["getMaxListeners"] = sinon.stub().returns(100);
	}
	if (!adapter["setMaxListeners"]) {
		adapter["setMaxListeners"] = sinon.stub();
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
			await adapter.setState(stateID, testComponent.NumberValue, true);

			const SUT = new SimplePropertyChangedHandler<TestComponent>(
				adapter as unknown as ioBroker.Adapter,
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
			await adapter.setState(stateID, testComponent.NumberValue, true);

			const SUT = new ComplexPropertyChangedHandler<TestComponent>(
				adapter as unknown as ioBroker.Adapter,
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
			await adapter.setState(stateID, testComponent.NumberValue, true);
		});

		it("should set the property 'NumberValue' to 43 when the adapter state is set.", async function () {
			const expectedResult = 43;

			const disposalMap = new DisposalMap();
			try {
				const SUT = new SimpleStateChangeHandler<TestComponent>(
					adapter as unknown as ioBroker.Adapter,
					stateID,
					"NumberValue",
					testComponent,
				);
				await SUT.Initialize();
				disposalMap.set(stateID, SUT);

				await setState(adapter, stateID, expectedResult, disposalMap, false);

				expect(testComponent.NumberValue).to.be.equal(expectedResult);
			} finally {
				await disposalMap.disposeAll();
			}
		});

		it("should set the property 'NumberValue' to 43 when the adapter state is set with explicit setterMethodName.", async function () {
			const expectedResult = 43;

			const disposalMap = new DisposalMap();
			try {
				const SUT = new SimpleStateChangeHandler<TestComponent>(
					adapter as unknown as ioBroker.Adapter,
					stateID,
					"NumberValue",
					testComponent,
					"setNumberValueAsync",
				);
				await SUT.Initialize();
				disposalMap.set(stateID, SUT);

				await setState(adapter, stateID, expectedResult, disposalMap, false);

				expect(testComponent.NumberValue).to.be.equal(expectedResult);
			} finally {
				await disposalMap.disposeAll();
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
			await adapter.setState(stateID, testComponent.NumberValue, true);
		});

		it("should call the provided handly exaclty once.", async function () {
			const expectedResult = 43;

			const handler = sinon.stub<[ioBroker.State | null | undefined], Promise<void>>();
			const disposalMap = new DisposalMap();
			try {
				const SUT = new ComplexStateChangeHandler(adapter as unknown as ioBroker.Adapter, stateID, handler);
				await SUT.Initialize();
				disposalMap.set(stateID, SUT);

				await setState(adapter, stateID, expectedResult, disposalMap, false);

				expect(handler.calledOnce).to.be.true;
			} finally {
				await disposalMap.disposeAll();
			}
		});
	});

	describe("MethodCallStateChangeHandler", function () {
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
			await adapter.setState(stateID, testComponent.NumberValue, true);
		});

		it("should call the function TestComponent.runAMethod with parameters 1, 2, '3'.", async function () {
			const methodSpy = sinon.spy(testComponent, "runAMethod");
			try {
				const SUT = new MethodCallStateChangeHandler(
					adapter as unknown as ioBroker.Adapter,
					stateID,
					testComponent,
					"runAMethod",
					() => {
						return Promise.resolve([1, 2, "3"] as AsyncMethodParameters<TestComponent, "runAMethod">);
					},
				);
				try {
					await SUT.Initialize();
					await SUT.onStateChange({
						val: 42,
						ack: false,
						ts: 0,
						lc: 0,
						from: stateID,
					});
					expect(methodSpy).to.be.calledOnceWithExactly(1, 2, "3");
				} finally {
					await SUT.dispose();
				}
			} finally {
				methodSpy.restore();
			}
		});
	});
});
