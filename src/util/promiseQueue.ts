"use strict";

export type AsyncFunction<T> = () => Promise<T | void>;

export class PromiseQueue<T> {
	private _nextPromise: Promise<T | void> = Promise.resolve();

	public push(asyncFunction: AsyncFunction<T>): this {
		this._nextPromise = this._nextPromise.then(asyncFunction, asyncFunction);

		return this;
	}

	public async waitAsync(): Promise<T | void> {
		await this._nextPromise;
	}
}
