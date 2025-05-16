"use strict";

export type AsyncFunction<T> = () => Promise<T | void>;

/**
 * Queue of asynchronous functions to be executed in order.
 */
export class PromiseQueue<T> {
	private _nextPromise: Promise<T | void> = Promise.resolve();

	/**
	 * Pushes an asynchronous function to the queue to be executed.
	 * If the previously added function resolves, the added function will be called.
	 * If the previously added function rejects, the added function will be called with the rejection as argument.
	 * Rejections are not propagated to the next function, but instead are handled by the next function.
	 * The function will be called with no arguments.
	 *
	 * @param asyncFunction The asynchronous function to add to the queue
	 * @returns This object, for chaining
	 */
	public push(asyncFunction: AsyncFunction<T>): this {
		// deepcode ignore PromiseNotCaughtGeneral: Functions will be called subsequently, no matter if there are rejections in-between.
		this._nextPromise = this._nextPromise.then(asyncFunction, asyncFunction);

		return this;
	}

	/**
	 * Waits until all previously added functions have been executed.
	 * Returns the last value returned by one of the functions, or undefined if none of the functions returned a value.
	 *
	 * @returns A promise that resolves to the last value returned by one of the functions
	 */
	public async waitAsync(): Promise<T | void> {
		await this._nextPromise;
	}
}
