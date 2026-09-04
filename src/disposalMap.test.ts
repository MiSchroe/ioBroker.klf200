import type { Disposable } from "klf-200-api";
import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { DisposalMap } from "./disposalMap.js";

class DisposableSpy implements Disposable {
	public DisposeSpy = mock.fn();
	dispose(): void {
		this.DisposeSpy();
	}
}

describe("disposalMap", () => {
	describe("disposeId", () => {
		it(`should call and remove a single entry`, async function () {
			const sut = new DisposalMap();
			const a_b_c = new DisposableSpy();
			sut.set("a.b.c", a_b_c);
			await sut.disposeId("a.b.c");
			assert.strictEqual(a_b_c.DisposeSpy.mock.callCount(), 1, "a_b_c called");
			assert.strictEqual(sut.size, 0, "Size of disposal map");
		});

		it(`should call and remove 2 entries`, async function () {
			const sut = new DisposalMap();
			const a_b_c = new DisposableSpy();
			const a_b_d = new DisposableSpy();
			sut.set("a.b.c", a_b_c);
			sut.set("a.b.d", a_b_d);
			await sut.disposeId("a.b");
			assert.strictEqual(a_b_c.DisposeSpy.mock.callCount(), 1, "a_b_c called");
			assert.strictEqual(a_b_d.DisposeSpy.mock.callCount(), 1, "a_b_d called");
			assert.strictEqual(sut.size, 0, "Size of disposal map");
		});

		it(`should call and remove 2 entries but should leave the remaining entries`, async function () {
			const sut = new DisposalMap();
			const a_b_c = new DisposableSpy();
			const a_b_d = new DisposableSpy();
			const b_c_d = new DisposableSpy();
			const b_c_e = new DisposableSpy();
			sut.set("a.b.c", a_b_c);
			sut.set("a.b.d", a_b_d);
			sut.set("b.c.d", b_c_d);
			sut.set("b.c.e", b_c_e);
			await sut.disposeId("a.b");
			assert.strictEqual(a_b_c.DisposeSpy.mock.callCount(), 1, "a_b_c called");
			assert.strictEqual(a_b_d.DisposeSpy.mock.callCount(), 1, "a_b_d called");
			assert.strictEqual(b_c_d.DisposeSpy.mock.callCount(), 0, "b_c_d called");
			assert.strictEqual(b_c_e.DisposeSpy.mock.callCount(), 0, "b_c_e called");
			assert.strictEqual(sut.size, 2, "Size of disposal map");
		});
	});

	describe("disposeAll", () => {
		it(`should call and remove all entries`, async function () {
			const sut = new DisposalMap();
			const a_b_c = new DisposableSpy();
			const a_b_d = new DisposableSpy();
			const b_c_d = new DisposableSpy();
			const b_c_e = new DisposableSpy();
			sut.set("a.b.c", a_b_c);
			sut.set("a.b.d", a_b_d);
			sut.set("b.c.d", b_c_d);
			sut.set("b.c.e", b_c_e);
			await sut.disposeAll();
			assert.strictEqual(a_b_c.DisposeSpy.mock.callCount(), 1, "a_b_c called");
			assert.strictEqual(a_b_d.DisposeSpy.mock.callCount(), 1, "a_b_d called");
			assert.strictEqual(b_c_d.DisposeSpy.mock.callCount(), 1, "b_c_d called");
			assert.strictEqual(b_c_e.DisposeSpy.mock.callCount(), 1, "b_c_e called");
			assert.strictEqual(sut.size, 0, "Size of disposal map");
		});
	});
});
