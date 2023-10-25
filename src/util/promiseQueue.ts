"use strict";

export type AsyncFunction<T> = () => Promise<T | void>;

export class PromiseQueue<T> {
	private _nextPromise: Promise<T | void> = Promise.resolve();

	public push(asyncFunction: AsyncFunction<T>): this {
		// deepcode ignore PromiseNotCaughtGeneral: Functions will be called subsequently, no matter if there are rejections in-between.
		this._nextPromise = this._nextPromise.then(asyncFunction, asyncFunction);

		return this;
	}

	public async waitAsync(): Promise<T | void> {
		await this._nextPromise;
	}
}
