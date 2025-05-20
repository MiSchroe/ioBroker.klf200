import { expect } from "chai";
import sinon from "sinon";
import { PromiseQueue } from "./promiseQueue.js";

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

		it("should be able to run subsequent calls with a rejected promise in the middle.", async function () {
			const callSpy = sinon.spy();

			const testFunc1 = async (): Promise<number> => {
				callSpy();
				return Promise.resolve(42);
			};
			const testFunc2 = async (): Promise<string> => {
				callSpy();
				return Promise.reject(new Error("Rejected"));
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

		it("should be rejected with a rejected promise at the end.", async function () {
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
				return Promise.reject(new Error("Rejected"));
			};

			const SUT = new PromiseQueue();
			SUT.push(testFunc1).push(testFunc2).push(testFunc3);

			const result = SUT.waitAsync();

			return expect(result).to.eventually.be.rejected;
		});
	});
});
