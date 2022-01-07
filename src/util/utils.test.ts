// Don't delete this line otherwise on save some weird changes will be introduced!
import { expect, use } from "chai";
import { ArrayCount, convertErrorToString } from "./utils";
import chaiAsPromised = require("chai-as-promised");

use(chaiAsPromised);

describe("utils", function () {
	describe("ArrayCount", function () {
		it("should count the number of non-empty elements", function () {
			const testData: number[] = [];
			testData[10] = 42;
			testData[20] = 43;

			expect(ArrayCount(testData)).to.be.equal(2);
		});

		it("should work on an empty array", function () {
			const testData: number[] = [];

			expect(ArrayCount(testData)).to.be.equal(0);
		});

		it("should work on an empty array with a defined length", function () {
			const testData: number[] = [];
			testData.length = 10;

			expect(ArrayCount(testData)).to.be.equal(0);
		});
	});

	describe("convertErrorToString", function () {
		it("should return the provided string on string input", function () {
			const testData: string = "42";
			const expectedResult: string = "42";
			expect(convertErrorToString(testData)).to.be.equal(expectedResult);
		});

		it("should return the provided message on Error input", function () {
			const testData: Error = new Error("42");
			const expectedResult: string = "Error: 42";
			expect(convertErrorToString(testData)).to.be.equal(expectedResult);
		});
	});
});
