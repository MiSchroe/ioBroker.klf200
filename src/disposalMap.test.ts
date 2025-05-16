import { expect } from "chai";
import type { Disposable } from "klf-200-api";
import Sinon from "sinon";
import { DisposalMap } from "./disposalMap";

class DisposableSpy implements Disposable {
	public DisposeSpy = Sinon.spy();
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
			expect(a_b_c.DisposeSpy, "a_b_c called").to.be.calledOnce;
			expect(sut.size, "Size of disposal map").to.be.equal(0);
		});

		it(`should call and remove 2 entries`, async function () {
			const sut = new DisposalMap();
			const a_b_c = new DisposableSpy();
			const a_b_d = new DisposableSpy();
			sut.set("a.b.c", a_b_c);
			sut.set("a.b.d", a_b_d);
			await sut.disposeId("a.b");
			expect(a_b_c.DisposeSpy, "a_b_c called").to.be.calledOnce;
			expect(a_b_d.DisposeSpy, "a_b_d called").to.be.calledOnce;
			expect(sut.size, "Size of disposal map").to.be.equal(0);
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
			expect(a_b_c.DisposeSpy, "a_b_c called").to.be.calledOnce;
			expect(a_b_d.DisposeSpy, "a_b_d called").to.be.calledOnce;
			expect(b_c_d.DisposeSpy, "b_c_d called").not.to.be.called;
			expect(b_c_e.DisposeSpy, "b_c_e called").not.to.be.called;
			expect(sut.size, "Size of disposal map").to.be.equal(2);
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
			expect(a_b_c.DisposeSpy, "a_b_c called").to.be.calledOnce;
			expect(a_b_d.DisposeSpy, "a_b_d called").to.be.calledOnce;
			expect(b_c_d.DisposeSpy, "b_c_d called").to.be.calledOnce;
			expect(b_c_e.DisposeSpy, "b_c_e called").to.be.calledOnce;
			expect(sut.size, "Size of disposal map").to.be.equal(0);
		});
	});
});
