import { expect } from "chai";
import { PromiseQueue } from "./promiseQueue";
import sinon = require("sinon");

describe("PromiseQueue", function () {
	describe("push", function () {
		it("should be able to push different types of return values including void.", async function () {
			const callSpy = sinon.spy();

			const testFunc1 = async (): Promise<number> => {
				callSpy();
				return Promise.resolve(42);
			};
			const testFunc2 = async (): Promise<string> => {
				callSpy();
				return Promise.resolve("42");
			};
			const testFunc3 = async (): Promise<void> => {
				callSpy();
				return Promise.resolve();
			};

			const SUT = new PromiseQueue();
			SUT.push(testFunc1).push(testFunc2).push(testFunc3);

			const result = SUT.waitAsync();

			await result;

			expect(callSpy.calledThrice).to.be.true;

			return expect(result).to.eventually.be.fulfilled;
		});
	});
});
