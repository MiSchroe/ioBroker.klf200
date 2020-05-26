"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function MapAnyPropertyToState(propertyValue) {
    switch (typeof propertyValue) {
        case "boolean":
            return propertyValue;
        case "number":
            return propertyValue;
        case "string":
            return propertyValue;
        default:
            if (propertyValue) {
                return propertyValue.toString();
            }
    }
    return null;
}
exports.MapAnyPropertyToState = MapAnyPropertyToState;
class BasePropertyChangedHandler {
    constructor(Adapter, Property, LinkedObject) {
        this.Adapter = Adapter;
        this.Property = Property;
        this.LinkedObject = LinkedObject;
        this.disposable = LinkedObject.propertyChangedEvent.on(async (event) => {
            if (event.propertyName === this.Property) {
                return await this.onPropertyChangedTypedEvent(event.propertyValue);
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onPropertyChangedTypedEvent(newValue) {
        throw new Error("Method not implemented.");
    }
    dispose() {
        var _a;
        (_a = this.disposable) === null || _a === void 0 ? void 0 : _a.dispose();
    }
}
exports.BasePropertyChangedHandler = BasePropertyChangedHandler;
class ComplexPropertyChangedHandler extends BasePropertyChangedHandler {
    constructor(Adapter, Property, LinkedObject, Handler) {
        super(Adapter, Property, LinkedObject);
        this.Handler = Handler;
    }
    async onPropertyChangedTypedEvent(newValue) {
        return await this.Handler(newValue);
    }
    dispose() {
        var _a;
        (_a = this.disposable) === null || _a === void 0 ? void 0 : _a.dispose();
    }
}
exports.ComplexPropertyChangedHandler = ComplexPropertyChangedHandler;
class SimplePropertyChangedHandler extends BasePropertyChangedHandler {
    constructor(Adapter, StateId, Property, LinkedObject) {
        super(Adapter, Property, LinkedObject);
        this.StateId = StateId;
    }
    async onPropertyChangedTypedEvent(newValue) {
        return await this.Adapter.setStateAsync(this.StateId, MapAnyPropertyToState(newValue), true);
    }
    dispose() {
        var _a;
        (_a = this.disposable) === null || _a === void 0 ? void 0 : _a.dispose();
    }
}
exports.SimplePropertyChangedHandler = SimplePropertyChangedHandler;
class BaseStateChangeHandler {
    constructor(Adapter, StateId) {
        this.Adapter = Adapter;
        this.StateId = StateId;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onStateChange(state) {
        throw new Error("Method not implemented.");
    }
    async stateChanged(id, obj) {
        if (id === this.StateId) {
            await this.onStateChange(obj);
        }
    }
    async dispose() {
        await this.Adapter.unsubscribeStatesAsync(this.StateId);
    }
    async Initialize() {
        // // Bind the stateChanged function to the stateChange event
        // this.Adapter.on("stateChange", this.stateChanged.bind(this));
        // Listen to the corresponding stateChange event
        await this.Adapter.subscribeStatesAsync(this.StateId, { stateChange: this.stateChanged.bind(this) });
    }
}
exports.BaseStateChangeHandler = BaseStateChangeHandler;
class SimpleStateChangeHandler extends BaseStateChangeHandler {
    constructor(Adapter, StateId, Property, LinkedObject, SetterMethodName) {
        super(Adapter, StateId);
        this.Property = Property;
        this.LinkedObject = LinkedObject;
        this.SetterMethodName = SetterMethodName;
        if (SetterMethodName === undefined) {
            this.SetterMethodName = `set${Property}Async`;
        }
        this.Adapter.log.debug(`Create a simple state change handler to listen to state ${this.StateId} linked to property ${this.Property
        // eslint-disable-next-line @typescript-eslint/ban-types
        } on type ${this.LinkedObject.constructor.name}.`);
        // Double check, that the setter method exists
        if (typeof LinkedObject[this.SetterMethodName] === "function") {
            this.setterFunction = LinkedObject[this.SetterMethodName];
        }
        else {
            throw new Error(`${this.SetterMethodName} is not a function.`);
        }
    }
    async onStateChange(state) {
        this.Adapter.log.debug(`SimpleStateChangeHandler.onStateChange: ${state}`);
        if ((state === null || state === void 0 ? void 0 : state.ack) === false) {
            await this.setterFunction.call(this.LinkedObject, state.val);
        }
    }
}
exports.SimpleStateChangeHandler = SimpleStateChangeHandler;
class ComplexStateChangeHandler extends BaseStateChangeHandler {
    constructor(Adapter, StateId, Handler) {
        super(Adapter, StateId);
        this.Handler = Handler;
    }
    async onStateChange(state) {
        if ((state === null || state === void 0 ? void 0 : state.ack) === false) {
            await this.Handler(state);
        }
    }
}
exports.ComplexStateChangeHandler = ComplexStateChangeHandler;
