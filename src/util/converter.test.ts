import { expect } from "chai";
import { ActuatorType } from "klf-200-api";
import { EnumConverter, levelConverter, roleConverter } from "./converter";

describe("converter => convert", function() {
	it("should return window for ActuatorType.WindowOpener", function() {
		const map = {
			[ActuatorType.WindowOpener]: "window",
		};

		const expectedResult = "window";
		const result = new EnumConverter<ActuatorType>(map).convert(ActuatorType.WindowOpener);
		expect(result).to.be.equal(expectedResult);
	});
});

describe("roleConverter => convert", function() {
	it("should return window for ActuatorType.WindowOpener", function() {
		const expectedResult = "window";
		const result = roleConverter.convert(ActuatorType.WindowOpener);
		expect(result).to.be.equal(expectedResult);
	});
});

describe("levelConverter => convert", function() {
	it("should return level.blind for ActuatorType.WindowOpener", function() {
		const expectedResult = "level.blind";
		const result = levelConverter.convert(ActuatorType.WindowOpener);
		expect(result).to.be.equal(expectedResult);
	});
});
