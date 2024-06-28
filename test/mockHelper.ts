"use strict";

import { MockAdapter } from "@iobroker/testing";
import { Disposable } from "klf-200-api";
import { BaseStateChangeHandler } from "../src/util/propertyLink";

// Function to simulate the event handling
export async function setState(
	adapter: MockAdapter,
	id: string,
	state: ioBroker.State | ioBroker.StateValue | ioBroker.SettableState,
	disposables: Disposable[],
	ack?: boolean,
): ioBroker.SetStatePromise;
export async function setState(
	adapter: MockAdapter,
	id: string,
	state: ioBroker.State | ioBroker.StateValue | ioBroker.SettableState,
	disposables: Disposable[],
	options?: unknown,
): ioBroker.SetStatePromise;
export async function setState(
	adapter: MockAdapter,
	id: string,
	state: ioBroker.State | ioBroker.StateValue | ioBroker.SettableState,
	disposables: Disposable[],
	ack: boolean,
	options: unknown,
): ioBroker.SetStatePromise;
export async function setState(
	adapter: MockAdapter,
	id: string,
	state: ioBroker.State | ioBroker.StateValue | ioBroker.SettableState,
	disposables: Disposable[],
	ackOrOptions: boolean | unknown | undefined,
	options?: unknown,
): ioBroker.SetStatePromise {
	const ack = typeof ackOrOptions === "boolean" ? ackOrOptions : false;
	const result =
		typeof ackOrOptions === "boolean"
			? await adapter.setState(id, state, ackOrOptions, options)
			: await adapter.setState(id, state, ackOrOptions);

	const stateChange: ioBroker.State = {
		val: null,
		ack: ack,
		ts: 12345,
		lc: 12345,
		from: "system.adapter.test.0",
	};
	if (state !== null) {
		if (typeof state !== "object") {
			stateChange.val = state;
		} else {
			// deepcode ignore FunctionDeclarationInBlock/test: internal helper function only needed for texting purposes
			function _setPropsHelper<StateType extends ioBroker.State | ioBroker.SettableState>(
				sourceObject: StateType,
				targetObject: StateType,
			): void {
				for (const propName in sourceObject) {
					targetObject[propName] = sourceObject[propName];
				}
			}
			_setPropsHelper(state, stateChange);
		}
	}

	// Mimick the event handling logic:
	for (const disposable of disposables) {
		if (disposable instanceof BaseStateChangeHandler && disposable.StateId === id) {
			await disposable.onStateChange(stateChange);
		}
	}
	/* Let it run */
	await new Promise((resolve) => {
		setTimeout(resolve, 0);
	});

	return result;
}
