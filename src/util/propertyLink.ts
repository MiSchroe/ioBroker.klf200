"use strict";

import { EventEmitter } from "events";
import { Component, Disposable, PropertyChangedEvent } from "klf-200-api";
import { PromiseQueue } from "./promiseQueue";
import { AsyncMethodName, AsyncMethodParameters, AsyncMethodType } from "./utils";

export function MapAnyPropertyToState<T extends Component, P extends keyof T>(
	propertyValue: T[P],
): string | number | boolean | null {
	switch (typeof propertyValue) {
		case "boolean":
			return propertyValue as boolean;

		case "number":
			return propertyValue as number;

		case "string":
			return propertyValue as string;

		default:
			if (propertyValue) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
				return (propertyValue as any).toString();
			}
	}

	return null;
}

export interface PropertyChangedEventHandler<T extends Component, P extends keyof T> {
	readonly Adapter: ioBroker.Adapter;
	readonly Property: P;
	readonly LinkedObject: T;
	onPropertyChangedTypedEvent(newValue: T[P]): Promise<void>;
}

export interface StateChangedEventHandler {
	readonly Adapter: ioBroker.Adapter;
	readonly StateId: string;
	onStateChange(state: ioBroker.State | null | undefined): Promise<void>;
}

export abstract class BasePropertyChangedHandler<T extends Component, P extends keyof T>
	implements PropertyChangedEventHandler<T, P>, Disposable
{
	protected disposable?: Disposable;

	constructor(
		readonly Adapter: ioBroker.Adapter,
		readonly Property: P,
		readonly LinkedObject: T,
	) {
		this.disposable = LinkedObject.propertyChangedEvent.on(async (event: PropertyChangedEvent) => {
			if (event.propertyName === this.Property) {
				await this.onPropertyChangedTypedEvent(event.propertyValue as T[P]);
			}
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onPropertyChangedTypedEvent(newValue: T[P]): Promise<void> {
		throw new Error("Method not implemented.");
	}

	dispose(): void {
		this.disposable?.dispose();
	}
}

export type OnPropertyChangedHandlerFunctionType<T extends Component, P extends keyof T> = (
	newValue: T[P],
) => Promise<void>;

export class ComplexPropertyChangedHandler<T extends Component, P extends keyof T> extends BasePropertyChangedHandler<
	T,
	P
> {
	constructor(
		Adapter: ioBroker.Adapter,
		Property: P,
		LinkedObject: T,
		readonly Handler: OnPropertyChangedHandlerFunctionType<T, P>,
	) {
		super(Adapter, Property, LinkedObject);
	}

	async onPropertyChangedTypedEvent(newValue: T[P]): Promise<void> {
		await this.Handler(newValue);
	}

	dispose(): void {
		this.disposable?.dispose();
	}
}

export class SimplePropertyChangedHandler<T extends Component, P extends keyof T> extends BasePropertyChangedHandler<
	T,
	P
> {
	constructor(
		Adapter: ioBroker.Adapter,
		readonly StateId: string,
		Property: P,
		LinkedObject: T,
	) {
		super(Adapter, Property, LinkedObject);
	}

	async onPropertyChangedTypedEvent(newValue: T[P]): Promise<void> {
		await this.Adapter.setState(this.StateId, MapAnyPropertyToState(newValue), true);
	}

	dispose(): void {
		this.disposable?.dispose();
	}
}

export class PercentagePropertyChangedHandler<
	T extends Component,
	P extends keyof T,
> extends SimplePropertyChangedHandler<T, P> {
	async onPropertyChangedTypedEvent(newValue: T[P]): Promise<void> {
		await this.Adapter.setState(this.StateId, Math.round((MapAnyPropertyToState(newValue) as number) * 100), true);
	}
}

export const klfPromiseQueue = new PromiseQueue();

export abstract class BaseStateChangeHandler implements StateChangedEventHandler, Disposable {
	constructor(
		readonly Adapter: ioBroker.Adapter,
		readonly StateId: string,
	) {
		/// The default number of listeners may not be high enough -> raise it to suppress warnings
		const adapterEmitter = this.Adapter;
		const newMaxSize = adapterEmitter.getMaxListeners() + 1;
		this.logEventEmitterMaxSize(newMaxSize);
		adapterEmitter.setMaxListeners(newMaxSize);
	}

	private logEventEmitterMaxSize(newMaxSize: number): void {
		this.Adapter.log.debug(`Set maximum number of event listeners of adapter to ${newMaxSize}.`);
	}

	async onStateChange(_state: ioBroker.State | null | undefined): Promise<void> {
		return Promise.reject(new Error("Method not implemented."));
	}

	private async stateChanged(id: string, obj: ioBroker.State | null | undefined): Promise<void> {
		this.Adapter.log.silly(
			`State changed event received for id ${id}. New state: ${JSON.stringify(obj)}. Handled by ${
				this.constructor.name
			}`,
		);
		if (id === `${this.Adapter.namespace}.${this.StateId}`) {
			try {
				await this.onStateChange(obj);
			} catch (error) {
				this.Adapter.log.error(
					`Couldn't set state ${id} to value ${obj?.val?.toLocaleString()}: ${(error as Error).message}`,
				);
				if (error instanceof Error && error.stack) {
					this.Adapter.log.debug(error.stack);
				}
				if (obj) {
					const errorState: ioBroker.SettableState = {
						val: obj.val,
						q: /* ioBroker.STATE_QUALITY.DEVICE_ERROR_REPORT */ 68,
						ack: true,
					};
					await this.Adapter.setState(id, errorState);
				}
			}
		}
	}

	async dispose(): Promise<void> {
		try {
			await this.Adapter.unsubscribeStatesAsync(this.StateId);
		} finally {
			const adapterEmitter = this.Adapter as unknown as EventEmitter;
			const newMaxSize = Math.max(adapterEmitter.getMaxListeners() - 1, 0);
			this.logEventEmitterMaxSize(newMaxSize);
			adapterEmitter.setMaxListeners(newMaxSize);
		}
	}

	async Initialize(): Promise<void> {
		// Bind the stateChanged function to the stateChange event
		this.Adapter.on("stateChange", this.stateChanged.bind(this));

		// Listen to the corresponding stateChange event
		await this.Adapter.subscribeStatesAsync(this.StateId);
	}
}

export class EchoStateChangeHandler extends BaseStateChangeHandler {
	async onStateChange(state: ioBroker.State | null | undefined): Promise<void> {
		if (state?.ack === false) {
			await this.Adapter.setState(this.StateId, state.val, true);
		}
	}
}

interface SetterFunction {
	ArbitrarySetterFunction(Param1: ioBroker.StateValue, ...args: any[]): Promise<any>;
}

export class SetterStateChangeHandler<T extends Component> extends BaseStateChangeHandler {
	constructor(
		Adapter: ioBroker.Adapter,
		StateId: string,
		readonly LinkedObject: T,
		readonly SetterMethodName: keyof T,
	) {
		super(Adapter, StateId);

		this.Adapter.log.debug(
			`Create a setter state change handler to listen to state ${this.StateId} linked to property ${
				String(this.SetterMethodName)
				// eslint-disable-next-line @typescript-eslint/ban-types
			} on type ${(this.LinkedObject as Object).constructor.name}.`,
		);

		// Double check, that the setter method exists
		if (typeof LinkedObject[this.SetterMethodName] === "function") {
			this.setterFunction = LinkedObject[this.SetterMethodName] as SetterFunction["ArbitrarySetterFunction"];
		} else {
			throw new Error(`${String(this.SetterMethodName)} is not a function.`);
		}
	}

	private setterFunction: SetterFunction["ArbitrarySetterFunction"];
	get SetterFunction(): SetterFunction["ArbitrarySetterFunction"] {
		return this.setterFunction;
	}

	async onStateChange(state: ioBroker.State | null | undefined): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		this.Adapter.log.debug(`SetterStateChangeHandler.onStateChange: ${state}`);
		if (state?.ack === false) {
			await klfPromiseQueue
				.push(
					(async () => {
						await this.setterFunction.call(this.LinkedObject, state.val);
					}).bind(this),
				)
				.waitAsync();
		}
	}
}

export class SimpleStateChangeHandler<T extends Component> extends SetterStateChangeHandler<T> {
	constructor(
		Adapter: ioBroker.Adapter,
		StateId: string,
		readonly Property: keyof T,
		LinkedObject: T,
		SetterMethodName?: keyof T,
	) {
		super(Adapter, StateId, LinkedObject, SetterMethodName ?? (`set${String(Property)}Async` as keyof T));

		this.Adapter.log.debug(
			`Create a simple state change handler to listen to state ${this.StateId} linked to property ${
				String(this.Property)
				// eslint-disable-next-line @typescript-eslint/ban-types
			} on type ${(this.LinkedObject as Object).constructor.name}.`,
		);
	}
}

export class PercentageStateChangeHandler<T extends Component> extends SetterStateChangeHandler<T> {
	async onStateChange(state: ioBroker.State | null | undefined): Promise<void> {
		if (state?.ack === false) {
			await klfPromiseQueue
				.push(
					(async () => {
						await this.SetterFunction.call(this.LinkedObject, (state.val as number) / 100);
					}).bind(this),
				)
				.waitAsync();
		}
	}
}

export type OnStateChangedHandlerFunctionType = (state: ioBroker.State | null | undefined) => Promise<void>;

export class ComplexStateChangeHandler extends BaseStateChangeHandler {
	constructor(
		Adapter: ioBroker.Adapter,
		StateId: string,
		readonly Handler: OnStateChangedHandlerFunctionType,
	) {
		super(Adapter, StateId);
	}

	async onStateChange(state: ioBroker.State | null | undefined): Promise<void> {
		if (state?.ack === false) {
			await klfPromiseQueue
				.push(
					(async () => {
						await this.Handler(state);
					}).bind(this),
				)
				.waitAsync();
		}
	}
}

export class MethodCallStateChangeHandler<Type, MN extends AsyncMethodName<Type>> extends ComplexStateChangeHandler {
	private targetMethod: AsyncMethodType<Type, MN>;
	constructor(
		Adapter: ioBroker.Adapter,
		StateId: string,
		readonly LinkedObject: Type,
		readonly MethodName: MN,
		readonly ArgumentProvider?: (
			state: ioBroker.State | null | undefined,
		) => Promise<AsyncMethodParameters<Type, MN>>,
	) {
		super(Adapter, StateId, async (state: ioBroker.State | null | undefined): Promise<void> => {
			await this.Adapter.setState(this.StateId, state !== null && state !== undefined ? state : null, true);
			if (state?.val) {
				this.Adapter.log.silly(
					`Calling method ${String(this.MethodName)} on class ${(LinkedObject as object).constructor.name}`,
				);
				if (this.ArgumentProvider) {
					const args = await this.ArgumentProvider(state);
					await this.targetMethod(...args);
				} else {
					await this.targetMethod();
				}
				await this.Adapter.setState(this.StateId, false, true);
			}
		});
		this.targetMethod = (this.LinkedObject[this.MethodName] as CallableFunction).bind(
			LinkedObject,
		) as AsyncMethodType<Type, MN>;
	}
}
