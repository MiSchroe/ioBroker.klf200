"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexStateChangeHandler = exports.PercentageStateChangeHandler = exports.SimpleStateChangeHandler = exports.SetterStateChangeHandler = exports.EchoStateChangeHandler = exports.BaseStateChangeHandler = exports.klfPromiseQueue = exports.PercentagePropertyChangedHandler = exports.SimplePropertyChangedHandler = exports.ComplexPropertyChangedHandler = exports.BasePropertyChangedHandler = exports.MapAnyPropertyToState = void 0;
const promiseQueue_1 = require("./promiseQueue");
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
class PercentagePropertyChangedHandler extends SimplePropertyChangedHandler {
    async onPropertyChangedTypedEvent(newValue) {
        return await this.Adapter.setStateAsync(this.StateId, Math.round(MapAnyPropertyToState(newValue) * 100), true);
    }
}
exports.PercentagePropertyChangedHandler = PercentagePropertyChangedHandler;
exports.klfPromiseQueue = new promiseQueue_1.PromiseQueue();
class BaseStateChangeHandler {
    constructor(Adapter, StateId) {
        this.Adapter = Adapter;
        this.StateId = StateId;
        /// The default number of listeners may not be high enough -> raise it to suppress warnings
        const adapterEmitter = this.Adapter;
        const newMaxSize = adapterEmitter.getMaxListeners() + 1;
        this.logEventEmitterMaxSize(newMaxSize);
        adapterEmitter.setMaxListeners(newMaxSize);
    }
    logEventEmitterMaxSize(newMaxSize) {
        this.Adapter.log.debug(`Set maximum number of event listeners of adapter to ${newMaxSize}.`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onStateChange(state) {
        throw new Error("Method not implemented.");
    }
    async stateChanged(id, obj) {
        if (id === `${this.Adapter.namespace}.${this.StateId}`) {
            await this.onStateChange(obj);
        }
    }
    async dispose() {
        try {
            await this.Adapter.unsubscribeStatesAsync(this.StateId);
        }
        finally {
            const adapterEmitter = this.Adapter;
            const newMaxSize = Math.max(adapterEmitter.getMaxListeners() - 1, 0);
            this.logEventEmitterMaxSize(newMaxSize);
            adapterEmitter.setMaxListeners(newMaxSize);
        }
    }
    async Initialize() {
        // Bind the stateChanged function to the stateChange event
        this.Adapter.on("stateChange", this.stateChanged.bind(this));
        // Listen to the corresponding stateChange event
        await this.Adapter.subscribeStatesAsync(this.StateId);
    }
}
exports.BaseStateChangeHandler = BaseStateChangeHandler;
class EchoStateChangeHandler extends BaseStateChangeHandler {
    async onStateChange(state) {
        if ((state === null || state === void 0 ? void 0 : state.ack) === false) {
            await this.Adapter.setStateAsync(this.StateId, state.val, true);
        }
    }
}
exports.EchoStateChangeHandler = EchoStateChangeHandler;
class SetterStateChangeHandler extends BaseStateChangeHandler {
    constructor(Adapter, StateId, LinkedObject, SetterMethodName) {
        super(Adapter, StateId);
        this.LinkedObject = LinkedObject;
        this.SetterMethodName = SetterMethodName;
        this.Adapter.log.debug(`Create a setter state change handler to listen to state ${this.StateId} linked to property ${this.SetterMethodName
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
    get SetterFunction() {
        return this.setterFunction;
    }
    async onStateChange(state) {
        this.Adapter.log.debug(`SetterStateChangeHandler.onStateChange: ${state}`);
        if ((state === null || state === void 0 ? void 0 : state.ack) === false) {
            exports.klfPromiseQueue.push((async () => {
                await this.setterFunction.call(this.LinkedObject, state.val);
            }).bind(this));
        }
    }
}
exports.SetterStateChangeHandler = SetterStateChangeHandler;
class SimpleStateChangeHandler extends SetterStateChangeHandler {
    constructor(Adapter, StateId, Property, LinkedObject, SetterMethodName) {
        super(Adapter, StateId, LinkedObject, SetterMethodName !== null && SetterMethodName !== void 0 ? SetterMethodName : `set${Property}Async`);
        this.Property = Property;
        this.Adapter.log.debug(`Create a simple state change handler to listen to state ${this.StateId} linked to property ${this.Property
        // eslint-disable-next-line @typescript-eslint/ban-types
        } on type ${this.LinkedObject.constructor.name}.`);
    }
}
exports.SimpleStateChangeHandler = SimpleStateChangeHandler;
class PercentageStateChangeHandler extends SetterStateChangeHandler {
    async onStateChange(state) {
        if ((state === null || state === void 0 ? void 0 : state.ack) === false) {
            exports.klfPromiseQueue.push((async () => {
                await this.SetterFunction.call(this.LinkedObject, state.val / 100);
            }).bind(this));
        }
    }
}
exports.PercentageStateChangeHandler = PercentageStateChangeHandler;
class ComplexStateChangeHandler extends BaseStateChangeHandler {
    constructor(Adapter, StateId, Handler) {
        super(Adapter, StateId);
        this.Handler = Handler;
    }
    async onStateChange(state) {
        if ((state === null || state === void 0 ? void 0 : state.ack) === false) {
            exports.klfPromiseQueue.push((async () => {
                await this.Handler(state);
            }).bind(this));
        }
    }
}
exports.ComplexStateChangeHandler = ComplexStateChangeHandler;
//# sourceMappingURL=propertyLink.js.map