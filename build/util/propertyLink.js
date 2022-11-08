"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var propertyLink_exports = {};
__export(propertyLink_exports, {
  BasePropertyChangedHandler: () => BasePropertyChangedHandler,
  BaseStateChangeHandler: () => BaseStateChangeHandler,
  ComplexPropertyChangedHandler: () => ComplexPropertyChangedHandler,
  ComplexStateChangeHandler: () => ComplexStateChangeHandler,
  EchoStateChangeHandler: () => EchoStateChangeHandler,
  MapAnyPropertyToState: () => MapAnyPropertyToState,
  PercentagePropertyChangedHandler: () => PercentagePropertyChangedHandler,
  PercentageStateChangeHandler: () => PercentageStateChangeHandler,
  SetterStateChangeHandler: () => SetterStateChangeHandler,
  SimplePropertyChangedHandler: () => SimplePropertyChangedHandler,
  SimpleStateChangeHandler: () => SimpleStateChangeHandler,
  klfPromiseQueue: () => klfPromiseQueue
});
module.exports = __toCommonJS(propertyLink_exports);
var import_promiseQueue = require("./promiseQueue");
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
  onPropertyChangedTypedEvent(newValue) {
    throw new Error("Method not implemented.");
  }
  dispose() {
    var _a;
    (_a = this.disposable) == null ? void 0 : _a.dispose();
  }
}
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
    (_a = this.disposable) == null ? void 0 : _a.dispose();
  }
}
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
    (_a = this.disposable) == null ? void 0 : _a.dispose();
  }
}
class PercentagePropertyChangedHandler extends SimplePropertyChangedHandler {
  async onPropertyChangedTypedEvent(newValue) {
    return await this.Adapter.setStateAsync(
      this.StateId,
      Math.round(MapAnyPropertyToState(newValue) * 100),
      true
    );
  }
}
const klfPromiseQueue = new import_promiseQueue.PromiseQueue();
class BaseStateChangeHandler {
  constructor(Adapter, StateId) {
    this.Adapter = Adapter;
    this.StateId = StateId;
    const adapterEmitter = this.Adapter;
    const newMaxSize = adapterEmitter.getMaxListeners() + 1;
    this.logEventEmitterMaxSize(newMaxSize);
    adapterEmitter.setMaxListeners(newMaxSize);
  }
  logEventEmitterMaxSize(newMaxSize) {
    this.Adapter.log.debug(`Set maximum number of event listeners of adapter to ${newMaxSize}.`);
  }
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
    } finally {
      const adapterEmitter = this.Adapter;
      const newMaxSize = Math.max(adapterEmitter.getMaxListeners() - 1, 0);
      this.logEventEmitterMaxSize(newMaxSize);
      adapterEmitter.setMaxListeners(newMaxSize);
    }
  }
  async Initialize() {
    this.Adapter.on("stateChange", this.stateChanged.bind(this));
    await this.Adapter.subscribeStatesAsync(this.StateId);
  }
}
class EchoStateChangeHandler extends BaseStateChangeHandler {
  async onStateChange(state) {
    if ((state == null ? void 0 : state.ack) === false) {
      await this.Adapter.setStateAsync(this.StateId, state.val, true);
    }
  }
}
class SetterStateChangeHandler extends BaseStateChangeHandler {
  constructor(Adapter, StateId, LinkedObject, SetterMethodName) {
    super(Adapter, StateId);
    this.LinkedObject = LinkedObject;
    this.SetterMethodName = SetterMethodName;
    this.Adapter.log.debug(
      `Create a setter state change handler to listen to state ${this.StateId} linked to property ${this.SetterMethodName} on type ${this.LinkedObject.constructor.name}.`
    );
    if (typeof LinkedObject[this.SetterMethodName] === "function") {
      this.setterFunction = LinkedObject[this.SetterMethodName];
    } else {
      throw new Error(`${this.SetterMethodName} is not a function.`);
    }
  }
  get SetterFunction() {
    return this.setterFunction;
  }
  async onStateChange(state) {
    this.Adapter.log.debug(`SetterStateChangeHandler.onStateChange: ${state}`);
    if ((state == null ? void 0 : state.ack) === false) {
      klfPromiseQueue.push(
        (async () => {
          await this.setterFunction.call(this.LinkedObject, state.val);
        }).bind(this)
      );
    }
  }
}
class SimpleStateChangeHandler extends SetterStateChangeHandler {
  constructor(Adapter, StateId, Property, LinkedObject, SetterMethodName) {
    super(Adapter, StateId, LinkedObject, SetterMethodName != null ? SetterMethodName : `set${Property}Async`);
    this.Property = Property;
    this.Adapter.log.debug(
      `Create a simple state change handler to listen to state ${this.StateId} linked to property ${this.Property} on type ${this.LinkedObject.constructor.name}.`
    );
  }
}
class PercentageStateChangeHandler extends SetterStateChangeHandler {
  async onStateChange(state) {
    if ((state == null ? void 0 : state.ack) === false) {
      klfPromiseQueue.push(
        (async () => {
          await this.SetterFunction.call(this.LinkedObject, state.val / 100);
        }).bind(this)
      );
    }
  }
}
class ComplexStateChangeHandler extends BaseStateChangeHandler {
  constructor(Adapter, StateId, Handler) {
    super(Adapter, StateId);
    this.Handler = Handler;
  }
  async onStateChange(state) {
    if ((state == null ? void 0 : state.ack) === false) {
      klfPromiseQueue.push(
        (async () => {
          await this.Handler(state);
        }).bind(this)
      );
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BasePropertyChangedHandler,
  BaseStateChangeHandler,
  ComplexPropertyChangedHandler,
  ComplexStateChangeHandler,
  EchoStateChangeHandler,
  MapAnyPropertyToState,
  PercentagePropertyChangedHandler,
  PercentageStateChangeHandler,
  SetterStateChangeHandler,
  SimplePropertyChangedHandler,
  SimpleStateChangeHandler,
  klfPromiseQueue
});
//# sourceMappingURL=propertyLink.js.map
