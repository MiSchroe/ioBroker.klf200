"use strict";

import { Disposable, GW_SESSION_FINISHED_NTF, GatewayCommand, IConnection } from "klf-200-api";

export function ArrayCount<T>(arr: T[]): number {
	return arr
		.map((element) => (element !== null && element !== undefined ? 1 : 0) as number)
		.reduce((previousValue, currentValue) => previousValue + currentValue, 0);
}

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
			(event) => {
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
