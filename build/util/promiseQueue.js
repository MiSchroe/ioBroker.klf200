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
var promiseQueue_exports = {};
__export(promiseQueue_exports, {
  PromiseQueue: () => PromiseQueue
});
module.exports = __toCommonJS(promiseQueue_exports);
class PromiseQueue {
  constructor() {
    this._nextPromise = Promise.resolve();
  }
  push(asyncFunction) {
    this._nextPromise = this._nextPromise.then(asyncFunction, asyncFunction);
    return this;
  }
  async waitAsync() {
    await this._nextPromise;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PromiseQueue
});
//# sourceMappingURL=promiseQueue.js.map
