"use strict";

export class StateHelper {
	static async createAndSetStateAsync(
		adapter: ioBroker.Adapter,
		stateID: string,
		common: ioBroker.StateCommon,
		native: Record<string, any>,
		value: string | number | boolean | ioBroker.State | ioBroker.SettableState | null,
	): Promise<void> {
		await adapter.extendObjectAsync(stateID, {
			type: "state",
			common: common,
			native: native,
		});
		await adapter.setStateAsync(stateID, value, true);
	}
}
