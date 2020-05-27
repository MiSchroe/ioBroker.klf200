"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StateHelper {
    static async createAndSetStateAsync(adapter, stateID, common, native, value) {
        await adapter.setObjectNotExistsAsync(stateID, {
            type: "state",
            common: common,
            native: native,
        });
        await adapter.setStateAsync(stateID, value, true);
    }
}
exports.StateHelper = StateHelper;
//# sourceMappingURL=stateHelper.js.map