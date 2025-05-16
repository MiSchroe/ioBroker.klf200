"use strict";

import { type Disposable, type GW_SESSION_FINISHED_NTF, GatewayCommand, type IConnection } from "klf-200-api";

/**
 * Returns the number of elements in the array that are not null or undefined.
 *
 * @param arr The array to count the elements of.
 */
export function ArrayCount<T>(arr: T[]): number {
	return arr
		.map(element => (element !== null && element !== undefined ? 1 : 0) as number)
		.reduce((previousValue, currentValue) => previousValue + currentValue, 0);
}

/**
 * Converts an error or string to a string representation.
 *
 * @param e The input value, which can be of any type.
 * @returns A string representation of the input. If the input is a string,
 *          it is returned as-is. If it is an Error, its string representation
 *          is returned. For any other type, an empty string is returned.
 */
export function convertErrorToString(e: unknown): string {
	let result = "";
	if (typeof e === "string") {
		result = e;
	} else if (e instanceof Error) {
		result = e.toString();
	}
	return result;
}

// Type helpers
type KeyOfType<T, V> = keyof {
	[P in keyof T as T[P] extends V ? P : never]: any;
};
export type MethodName<Type> = KeyOfType<Type, (...args: any[]) => any>;
export type AsyncMethodName<Type> = KeyOfType<Type, (...args: any[]) => Promise<any>>;

export type MethodType<Type, MN extends MethodName<Type>> = Type[MN] extends (...args: infer P) => infer R
	? (...args: P) => R
	: never;
export type AsyncMethodType<Type, MN extends AsyncMethodName<Type>> = Type[MN] extends (
	...args: infer P
) => Promise<infer R>
	? (...args: P) => Promise<R>
	: never;

export type MethodParameters<Type, MN extends MethodName<Type>> = Parameters<MethodType<Type, MN>>;
export type AsyncMethodParameters<Type, MN extends AsyncMethodName<Type>> = Parameters<AsyncMethodType<Type, MN>>;

export type MethodReturnType<Type, MN extends MethodName<Type>> = ReturnType<MethodType<Type, MN>>;
export type AsyncMethodReturnType<Type, MN extends AsyncMethodName<Type>> = ReturnType<AsyncMethodType<Type, MN>>;

// KLF200 helpers

/**
 * Waits for a session finished notification from the gateway.
 *
 * @param adapter The ioBroker adapter instance used for managing timeouts and logging.
 * @param connection The connection to the gateway from which the session finished notification is expected.
 * @param sessionId The ID of the session for which the finished notification is awaited.
 * @param timeout The maximum time to wait for the notification before rejecting the promise, in milliseconds.
 *                 Defaults to 3000 milliseconds.
 * @returns A promise that resolves when the session finished notification with the specified session ID is received,
 *          or rejects with a "Timeout error" if the notification is not received within the specified timeout period.
 */
export function waitForSessionFinishedNtfAsync(
	adapter: ioBroker.Adapter,
	connection: IConnection,
	sessionId: number,
	timeout: number = 3000,
): Promise<void> {
	return new Promise((resolve, reject) => {
		let sessionHandler: Disposable | undefined = undefined;
		const timeoutHandle = adapter.setTimeout(() => {
			sessionHandler?.dispose();
			sessionHandler = undefined;
			reject(new Error("Timeout error"));
		}, timeout);
		sessionHandler = connection.on(
			event => {
				if ((event as GW_SESSION_FINISHED_NTF).SessionID === sessionId) {
					// Stop the timer as soon as possible!
					adapter.clearTimeout(timeoutHandle);
					sessionHandler?.dispose();
					resolve();
				}
			},
			[GatewayCommand.GW_SESSION_FINISHED_NTF],
		);
	});
}
