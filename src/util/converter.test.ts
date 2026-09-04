import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ActuatorType } from "klf-200-api";
import { EnumConverter, levelConverter, roleConverter } from "./converter.js";

describe("converter => convert", function () {
	it("should return window for ActuatorType.WindowOpener", function () {
		const map = {
			[ActuatorType.WindowOpener]: "window",
		};

		const expectedResult = "window";
		const result = new EnumConverter<ActuatorType>(map).convert(ActuatorType.WindowOpener);
		assert.strictEqual(result, expectedResult);
	});
});

describe("roleConverter => convert", function () {
	it("should return window for ActuatorType.WindowOpener", function () {
		const expectedResult = "window";
		const result = roleConverter.convert(ActuatorType.WindowOpener);
		assert.strictEqual(result, expectedResult);
	});
});

describe("levelConverter => convert", function () {
	it("should return level.blind for ActuatorType.WindowOpener", function () {
		const expectedResult = "level.blind";
		const result = levelConverter.convert(ActuatorType.WindowOpener);
		assert.strictEqual(result, expectedResult);
	});
});
