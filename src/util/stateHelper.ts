"use strict";

/**
 * Helper class to create and set states
 */
export class StateHelper {
	/**
	 * Create and set a state
	 *
	 * @param adapter The adapter
	 * @param stateID The ID of the state
	 * @param common The common object
	 * @param native The native object
	 * @param value The value to set
	 * @returns Returns a Promise<void>
	 */
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
