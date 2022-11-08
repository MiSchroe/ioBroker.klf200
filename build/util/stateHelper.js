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
var stateHelper_exports = {};
__export(stateHelper_exports, {
  StateHelper: () => StateHelper
});
module.exports = __toCommonJS(stateHelper_exports);
class StateHelper {
  static async createAndSetStateAsync(adapter, stateID, common, native, value) {
    await adapter.setObjectNotExistsAsync(stateID, {
      type: "state",
      common,
      native
    });
    await adapter.setStateAsync(stateID, value, true);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  StateHelper
});
//# sourceMappingURL=stateHelper.js.map
