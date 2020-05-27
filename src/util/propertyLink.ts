"use strict";

import { Component, PropertyChangedEvent } from "klf-200-api/dist/utils/PropertyChangedEvent";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";

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

export class PercentagePropertyChangeHandler<T extends Component> extends SimplePropertyChangedHandler<T> {
	async onPropertyChangedTypedEvent(newValue: T[keyof T]): Promise<string> {
		return await this.Adapter.setStateAsync(this.StateId, (MapAnyPropertyToState(newValue) as number) * 100, true);
	}
}

export abstract class BaseStateChangeHandler implements StateChangedEventHandler, Disposable {
	constructor(readonly Adapter: ioBroker.Adapter, readonly StateId: string) {}

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
		await this.Adapter.unsubscribeStatesAsync(this.StateId);
	}

	async Initialize(): Promise<void> {
		// Bind the stateChanged function to the stateChange event
		this.Adapter.on("stateChange", this.stateChanged.bind(this));

		// Listen to the corresponding stateChange event
		await this.Adapter.subscribeStatesAsync(this.StateId);
	}
}

export class SimpleStateChangeHandler<T extends Component> extends BaseStateChangeHandler {
	constructor(
		Adapter: ioBroker.Adapter,
		StateId: string,
		readonly Property: keyof T,
		readonly LinkedObject: T,
		readonly SetterMethodName?: keyof T,
	) {
		super(Adapter, StateId);

		if (SetterMethodName === undefined) {
			this.SetterMethodName = `set${Property}Async` as keyof T;
		}

		this.Adapter.log.debug(
			`Create a simple state change handler to listen to state ${this.StateId} linked to property ${
				this.Property
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
		this.Adapter.log.debug(`SimpleStateChangeHandler.onStateChange: ${state}`);
		if (state?.ack === false) {
			await this.setterFunction.call(this.LinkedObject, state.val);
		}
	}
}

export class PercentageStateChangeHandler<T extends Component> extends SimpleStateChangeHandler<T> {
	async onStateChange(state: ioBroker.State | null | undefined): Promise<void> {
		if (state?.ack === false) {
			await this.SetterFunction.call(this.LinkedObject, (state.val as number) / 100);
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
			await this.Handler(state);
		}
	}
}
