"use strict";

import { EventEmitter } from "events";
import { Component, PropertyChangedEvent } from "klf-200-api/dist/utils/PropertyChangedEvent";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";
import { PromiseQueue } from "./promiseQueue";

export function MapAnyPropertyToState<T extends Component>(
	propertyValue: T[keyof T],
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
				return (propertyValue as any).toString();
			}
	}

	return null;
}

export interface PropertyChangedEventHandler<T extends Component> {
	readonly Adapter: ioBroker.Adapter;
	readonly Property: keyof T;
	readonly LinkedObject: T;
	onPropertyChangedTypedEvent(newValue: T[keyof T]): Promise<string>;
}

export interface StateChangedEventHandler {
	readonly Adapter: ioBroker.Adapter;
	readonly StateId: string;
	onStateChange(state: ioBroker.State | null | undefined): Promise<void>;
}

export abstract class BasePropertyChangedHandler<T extends Component>
	implements PropertyChangedEventHandler<T>, Disposable {
	protected disposable?: Disposable;

	constructor(readonly Adapter: ioBroker.Adapter, readonly Property: keyof T, readonly LinkedObject: T) {
		this.disposable = LinkedObject.propertyChangedEvent.on(async (event: PropertyChangedEvent) => {
			if (event.propertyName === this.Property) {
				return await this.onPropertyChangedTypedEvent(event.propertyValue as T[keyof T]);
			}
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onPropertyChangedTypedEvent(newValue: T[keyof T]): Promise<string> {
		throw new Error("Method not implemented.");
	}

	dispose(): void {
		this.disposable?.dispose();
	}
}

export type OnPropertyChangedHandlerFunctionType<T extends Component> = (newValue: T[keyof T]) => Promise<string>;

export class ComplexPropertyChangedHandler<T extends Component> extends BasePropertyChangedHandler<T> {
	constructor(
		Adapter: ioBroker.Adapter,
		Property: keyof T,
		LinkedObject: T,
		readonly Handler: OnPropertyChangedHandlerFunctionType<T>,
	) {
		super(Adapter, Property, LinkedObject);
	}

	async onPropertyChangedTypedEvent(newValue: T[keyof T]): Promise<string> {
		return await this.Handler(newValue);
	}

	dispose(): void {
		this.disposable?.dispose();
	}
}

export class SimplePropertyChangedHandler<T extends Component> extends BasePropertyChangedHandler<T> {
	constructor(Adapter: ioBroker.Adapter, readonly StateId: string, Property: keyof T, LinkedObject: T) {
		super(Adapter, Property, LinkedObject);
	}

	async onPropertyChangedTypedEvent(newValue: T[keyof T]): Promise<string> {
		return await this.Adapter.setStateAsync(this.StateId, MapAnyPropertyToState(newValue), true);
	}

	dispose(): void {
		this.disposable?.dispose();
	}
}

export class PercentagePropertyChangedHandler<T extends Component> extends SimplePropertyChangedHandler<T> {
	async onPropertyChangedTypedEvent(newValue: T[keyof T]): Promise<string> {
		return await this.Adapter.setStateAsync(
			this.StateId,
			Math.round((MapAnyPropertyToState(newValue) as number) * 100),
			true,
		);
	}
}

export const klfPromiseQueue = new PromiseQueue();

export abstract class BaseStateChangeHandler implements StateChangedEventHandler, Disposable {
	constructor(readonly Adapter: ioBroker.Adapter, readonly StateId: string) {
		/// The default number of listeners may not be high enough -> raise it to suppress warnings
		const adapterEmitter = (this.Adapter as unknown) as EventEmitter;
		const newMaxSize = adapterEmitter.getMaxListeners() + 1;
		this.logEventEmitterMaxSize(newMaxSize);
		adapterEmitter.setMaxListeners(newMaxSize);
	}

	private logEventEmitterMaxSize(newMaxSize: number): void {
		this.Adapter.log.debug(`Set maximum number of event listeners of adapter to ${newMaxSize}.`);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async onStateChange(state: ioBroker.State | null | undefined): Promise<void> {
		throw new Error("Method not implemented.");
	}

	private async stateChanged(id: string, obj: ioBroker.State | null | undefined): Promise<void> {
		if (id === `${this.Adapter.namespace}.${this.StateId}`) {
			await this.onStateChange(obj);
		}
	}

	async dispose(): Promise<void> {
		try {
			await this.Adapter.unsubscribeStatesAsync(this.StateId);
		} finally {
			const adapterEmitter = (this.Adapter as unknown) as EventEmitter;
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
				this.SetterMethodName
				// eslint-disable-next-line @typescript-eslint/ban-types
			} on type ${(this.LinkedObject as Object).constructor.name}.`,
		);

		// Double check, that the setter method exists
		if (typeof LinkedObject[this.SetterMethodName!] === "function") {
			this.setterFunction = (LinkedObject[this.SetterMethodName!] as unknown) as Function;
		} else {
			throw new Error(`${this.SetterMethodName!} is not a function.`);
		}
	}

	private setterFunction: Function;
	get SetterFunction(): Function {
		return this.setterFunction;
	}

	async onStateChange(state: ioBroker.State | null | undefined): Promise<void> {
		this.Adapter.log.debug(`SetterStateChangeHandler.onStateChange: ${state}`);
		if (state?.ack === false) {
			klfPromiseQueue.push(
				(async () => {
					await this.setterFunction.call(this.LinkedObject, state.val);
				}).bind(this),
			);
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
		super(Adapter, StateId, LinkedObject, SetterMethodName ?? (`set${Property}Async` as keyof T));

		this.Adapter.log.debug(
			`Create a simple state change handler to listen to state ${this.StateId} linked to property ${
				this.Property
				// eslint-disable-next-line @typescript-eslint/ban-types
			} on type ${(this.LinkedObject as Object).constructor.name}.`,
		);
	}
}

export class PercentageStateChangeHandler<T extends Component> extends SetterStateChangeHandler<T> {
	async onStateChange(state: ioBroker.State | null | undefined): Promise<void> {
		if (state?.ack === false) {
			klfPromiseQueue.push(
				(async () => {
					await this.SetterFunction.call(this.LinkedObject, (state.val as number) / 100);
				}).bind(this),
			);
		}
	}
}

export type OnStateChangedHandlerFunctionType = (state: ioBroker.State | null | undefined) => Promise<void>;

export class ComplexStateChangeHandler<T extends Component> extends BaseStateChangeHandler {
	constructor(Adapter: ioBroker.Adapter, StateId: string, readonly Handler: OnStateChangedHandlerFunctionType) {
		super(Adapter, StateId);
	}

	async onStateChange(state: ioBroker.State | null | undefined): Promise<void> {
		if (state?.ack === false) {
			klfPromiseQueue.push(
				(async () => {
					await this.Handler(state);
				}).bind(this),
			);
		}
	}
}
