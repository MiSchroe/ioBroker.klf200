/**
 * `node:assert` based replacement for `utils.unit.createAsserts()` of `@iobroker/testing`.
 *
 * The original helpers assert through chai's `should` interface, which only works when the test
 * setup has installed it globally with `chai.should()`. This adapter asserts with `node:assert`,
 * so the helpers used by the unit tests are reimplemented here with the same signatures.
 */

import type { utils } from "@iobroker/testing";
import assert from "node:assert/strict";

type Mocks = ReturnType<typeof utils.unit.createMocks>;
type MockDatabase = Mocks["database"];
type MockAdapter = Mocks["adapter"];

export interface Asserts {
	assertObjectExists: (id: string | string[]) => void;
	assertStateExists: (id: string | string[]) => void;
	assertStateHasValue: (id: string | string[], value: any) => void;
	assertStateIsAcked: (id: string | string[], ack?: boolean) => void;
	assertStateProperty: (id: string | string[], property: string, value: any) => void;
	assertObjectCommon: (id: string | string[], common: ioBroker.ObjectCommon) => void;
	assertObjectNative: (id: string | string[], native: Record<string, any>) => void;
}

/**
 * Resolves a possibly dotted property path, the way chai's `nested.include` does.
 *
 * @param obj The object to read from
 * @param path The property path, parts separated by a dot
 * @returns The value at the given path or `undefined`
 */
function getNested(obj: Record<string, any>, path: string): any {
	return path.split(".").reduce<any>((value, part) => (value === undefined ? undefined : value[part]), obj);
}

/**
 * Returns a collection of predefined assertions to be used in unit tests.
 *
 * @param db The mock database to operate on
 * @param adapter The mock adapter to operate on
 * @returns The assertion helpers
 */
export function createAsserts(db: MockDatabase, adapter: MockAdapter): Asserts {
	function normalizeID(id: string | string[]): string {
		if (Array.isArray(id)) {
			id = id.join(".");
		}
		// Test if this ID is fully qualified
		if (!/^[a-z0-9\-_]+\.\d+\./.test(id)) {
			id = `${adapter.namespace}.${id}`;
		}
		return id;
	}

	const ret: Asserts = {
		assertObjectExists(id: string | string[]): void {
			const objectId = normalizeID(id);
			assert.strictEqual(
				db.hasObject(objectId),
				true,
				`The object "${objectId}" does not exist but it was expected to!`,
			);
		},

		assertStateExists(id: string | string[]): void {
			const stateId = normalizeID(id);
			assert.strictEqual(
				db.hasState(stateId),
				true,
				`The state "${stateId}" does not exist but it was expected to!`,
			);
		},

		assertStateHasValue(id: string | string[], value: any): void {
			ret.assertStateProperty(id, "val", value);
		},

		assertStateIsAcked(id: string | string[], ack: boolean = true): void {
			ret.assertStateProperty(id, "ack", ack);
		},

		assertStateProperty(id: string | string[], property: string, value: any): void {
			const stateId = normalizeID(id);
			ret.assertStateExists(stateId);
			const state = db.getState(stateId) as Record<string, any>;
			assert.deepStrictEqual(
				state[property],
				value,
				`The state "${stateId}" was expected to have the property "${property}" with the value ${JSON.stringify(value)}, but it is ${JSON.stringify(state[property])}!`,
			);
		},

		assertObjectCommon(id: string | string[], common: ioBroker.ObjectCommon): void {
			assertObjectPart(id, "common", common as Record<string, any>);
		},

		assertObjectNative(id: string | string[], native: Record<string, any>): void {
			assertObjectPart(id, "native", native);
		},
	};

	function assertObjectPart(id: string | string[], part: "common" | "native", expected: Record<string, any>): void {
		const objectId = normalizeID(id);
		ret.assertObjectExists(objectId);
		const dbObj = db.getObject(objectId) as Record<string, any>;
		assert.ok(
			dbObj[part] && typeof dbObj[part] === "object",
			`The object "${objectId}" was expected to have a "${part}" part!`,
		);
		for (const [path, value] of Object.entries(expected)) {
			assert.deepStrictEqual(
				getNested(dbObj[part], path),
				value,
				`The object "${objectId}" was expected to have "${part}.${path}" with the value ${JSON.stringify(value)}, but it is ${JSON.stringify(getNested(dbObj[part], path))}!`,
			);
		}
	}

	return ret;
}
