"use strict";

export type AsyncFunction<T extends any> = () => Promise<T | void>;

export class PromiseQueue<T extends any> {
	private _nextPromise: Promise<T | void> = Promise.resolve();

	public push(asyncFunction: AsyncFunction<T>): this {
		this._nextPromise = this._nextPromise.then(asyncFunction, asyncFunction);

		return this;
	}

	public async waitAsync(): Promise<T | void> {
		await this._nextPromise;
	}
}
