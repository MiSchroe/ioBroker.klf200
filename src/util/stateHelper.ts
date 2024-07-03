"use strict";

export class StateHelper {
	static async createAndSetStateAsync(
		adapter: ioBroker.Adapter,
		stateID: string,
		common: ioBroker.StateCommon,
		native: Record<string, any>,
		value: string | number | boolean | ioBroker.State | ioBroker.SettableState | null,
	): Promise<void> {
		await adapter.extendObject(stateID, {
			type: "state",
			common: common,
			native: native,
		});
		await adapter.setState(stateID, value, true);
	}
}
