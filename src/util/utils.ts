"use strict";

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
