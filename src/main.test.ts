/**
 * This is a dummy TypeScript test file using node:assert and node:test
 *
 * It's automatically excluded from npm and its build output is excluded from both git and npm.
 * It is advised to test all your modules with accompanying *.test.ts-files
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("module to test => function to test", () => {
	// initializing logic
	const expected = 5;

	it(`should return ${expected}`, () => {
		const result = 5;
		// assign result a value from functionToTest
		assert.strictEqual(result, expected);
	});
	// ... more tests => it
});

// ... more test suites => describe
