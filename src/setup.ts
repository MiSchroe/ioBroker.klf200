"use strict";

import type { Disposable, Gateway } from "klf-200-api";
import { TimeoutError } from "promise-timeout";
import { ComplexStateChangeHandler } from "./util/propertyLink";
import { StateHelper } from "./util/stateHelper";

/**
 * Class to setup the adapter
 */
export class Setup implements Disposable {
	/**
	 * Constructor of the Setup class.
	 *
	 * @param adapter The instance of the ioBroker adapter.
	 * @param gateway The instance of the gateway.
	 */
	constructor(
		readonly adapter: ioBroker.Adapter,
		readonly gateway: Gateway,
	) {}

	private disposableEvents: Disposable[] = [];

	/**
	 * Dispose all resources held by the Setup class.
	 *
	 * Will stop the state timer and dispose all events that were registered.
	 */
	dispose(): void {
		this.stopStateTimer();
		this.disposableEvents.forEach(disposable => {
			disposable.dispose();
		});
	}

	private _stateTimer?: ReturnType<typeof setTimeout>;

	/**
	 * Start the state timer if it is not already running.
	 *
	 * The timer will trigger the stateTimerHandler function every 5 minutes.
	 * If the timer is already running (i.e. the stateTimerHandler function is currently executing),
	 * the timer will not be started again.
	 *
	 * The timer is stopped and started again in the stateTimerHandler function. This is to ensure,
	 * that the stateTimerHandler function is not called multiple times in parallel.
	 */
	public startStateTimer(): void {
		if (this._stateTimer === undefined) {
			this._stateTimer = setTimeout(
				(adapter, gateway) => {
					(async () => {
						this._stateTimer = undefined; // Timer has fired -> delete timer id
						await this.stateTimerHandler(adapter, gateway);
					})().catch((reason: any) => {
						this.adapter.log.error(`Error in state time: ${JSON.stringify(reason)}`);
					});
				},
				5 * 60 * 1000,
				this.adapter,
				this.gateway,
			);
		}
	}

	/**
	 * Stop the state timer.
	 *
	 * If the timer is not running (i.e. the stateTimerHandler function is not currently executing),
	 * this function does nothing.
	 *
	 * This function is called from the stateTimerHandler function to stop the timer after the handler
	 * has finished execution.
	 */
	public stopStateTimer(): void {
		if (this._stateTimer !== undefined) {
			try {
				clearTimeout(this._stateTimer);
			} finally {
				this._stateTimer = undefined;
			}
		}
	}

	stateTimerHandlerActive = false;

	/**
	 * This function is called periodically to read the state from the gateway and update the states in the ioBroker.
	 *
	 * This function should be called periodically to update the states in the ioBroker.
	 *
	 * @param adapter The ioBroker adapter that should be used to update the states.
	 * @param gateway The gateway that should be used to read the state.
	 * @returns A Promise that resolves when the state has been updated in the ioBroker.
	 */
	public async stateTimerHandler(adapter: ioBroker.Adapter, gateway: Gateway): Promise<void> {
		this.stopStateTimer();

		try {
			if (!this.stateTimerHandlerActive) {
				// Read state from the gateway only, if this is a new request, otherwise there could be a race condition that leads to a timeout

				this.stateTimerHandlerActive = true;

				try {
					const GatewayState = await gateway.getStateAsync();
					await adapter.setStateChangedAsync("gateway.GatewayState", GatewayState.GatewayState, true);
					await adapter.setStateChangedAsync("gateway.GatewaySubState", GatewayState.SubState, true);
				} catch (e) {
					if (e instanceof TimeoutError) {
						adapter.log.error(`Timemout occured during getting the current gateway status.`);
					} else {
						adapter.log.error(`Error occured during getting the current gateway status.`);
						adapter.log.error(`Error details: ${JSON.stringify(e)}`);
					}
				} finally {
					// Reset the flag, so that the next call to this method will query the gateway again.
					this.stateTimerHandlerActive = false;
				}
			}
		} finally {
			// Start the next timer, but only if we are connected
			if (gateway.connection.KLF200SocketProtocol !== undefined) {
				this.startStateTimer();
			}
		}
	}

	/**
	 * Creates a new instance of the Setup class and initializes the global objects and states.
	 *
	 * This function creates a new instance of the Setup class and initializes the global objects and states.
	 * It creates the following objects and states:
	 *
	 * - products device with a "productsFound" state
	 * - scenes device with a "scenesFound" state
	 * - groups device with a "groupsFound" state
	 * - gateway device with the following states:
	 *   - ProtocolVersion (string)
	 *   - SoftwareVersion (string)
	 *   - HardwareVersion (number)
	 *   - ProductGroup (number)
	 *   - ProductType (number)
	 *   - GatewayState (number)
	 *   - GatewaySubState (number)
	 *   - RebootGateway (boolean)
	 *
	 * @param adapter The ioBroker adapter that should be used to create the objects and states.
	 * @param gateway The gateway that should be used to read the state and protocol version.
	 * @returns A Promise that resolves with a new instance of the Setup class.
	 */
	public static async setupGlobalAsync(adapter: ioBroker.Adapter, gateway: Gateway): Promise<Setup> {
		const newSetup = new Setup(adapter, gateway);

		// Setup products device
		await adapter.setObjectNotExistsAsync("products", {
			type: "device",
			common: {
				name: "products",
			},
			native: {},
		});
		await adapter.setObjectNotExistsAsync("products.productsFound", {
			type: "state",
			common: {
				name: "Number of products found",
				role: "value",
				type: "number",
				min: 0,
				def: 0,
				read: true,
				write: false,
				desc: "Number of products connected to the interface",
			},
			native: {},
		});

		// Setup scenes device
		await adapter.setObjectNotExistsAsync("scenes", {
			type: "device",
			common: {
				name: "scenes",
			},
			native: {},
		});
		await adapter.setObjectNotExistsAsync("scenes.scenesFound", {
			type: "state",
			common: {
				name: "Number of scenes found",
				role: "value",
				type: "number",
				min: 0,
				def: 0,
				read: true,
				write: false,
				desc: "Number of scenes defined in the interface",
			},
			native: {},
		});

		// Setup groups device
		await adapter.setObjectNotExistsAsync("groups", {
			type: "device",
			common: {
				name: "groups",
			},
			native: {},
		});
		await adapter.setObjectNotExistsAsync("groups.groupsFound", {
			type: "state",
			common: {
				name: "Number of groups found",
				role: "value",
				type: "number",
				min: 0,
				def: 0,
				read: true,
				write: false,
				desc: "Number of groups defined in the interface",
			},
			native: {},
		});

		// Setup gateway device
		await adapter.setObjectNotExistsAsync("gateway", {
			type: "device",
			common: {
				name: "gateway",
			},
			native: {},
		});

		const ProtocolVersion = await gateway.getProtocolVersionAsync();

		await StateHelper.createAndSetStateAsync(
			adapter,
			"gateway.ProtocolVersion",
			{
				name: "Protocol version",
				role: "value",
				type: "string",
				def: "",
				read: true,
				write: false,
				desc: "Version of the protocol with which the software of the gateway is compatible",
			},
			{},
			`${ProtocolVersion.MajorVersion}.${ProtocolVersion.MinorVersion}`,
		);

		const Version = await gateway.getVersionAsync();

		await StateHelper.createAndSetStateAsync(
			adapter,
			"gateway.SoftwareVersion",
			{
				name: "SoftwareVersion",
				role: "value",
				type: "string",
				def: "",
				read: true,
				write: false,
				desc: "Software version number",
			},
			{},
			`${Version.SoftwareVersion.CommandVersion}.${Version.SoftwareVersion.MainVersion}.${Version.SoftwareVersion.SubVersion}.${Version.SoftwareVersion.BranchID}.${Version.SoftwareVersion.Build}.${Version.SoftwareVersion.MicroBuild}`,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			"gateway.HardwareVersion",
			{
				name: "HardwareVersion",
				role: "value",
				type: "number",
				def: 0,
				read: true,
				write: false,
				desc: "Hardware version number",
			},
			{},
			Version.HardwareVersion,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			"gateway.ProductGroup",
			{
				name: "ProductGroup",
				role: "value",
				type: "number",
				def: 0,
				read: true,
				write: false,
				desc: "Product group",
			},
			{},
			Version.ProductGroup,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			"gateway.ProductType",
			{
				name: "ProductType",
				role: "value",
				type: "number",
				def: 0,
				read: true,
				write: false,
				desc: "Product type",
			},
			{},
			Version.ProductType,
		);

		const gatewayState = await gateway.getStateAsync();

		await StateHelper.createAndSetStateAsync(
			adapter,
			"gateway.GatewayState",
			{
				name: "GatewayState",
				role: "value",
				type: "number",
				min: 0,
				max: 255,
				def: 0,
				read: true,
				write: false,
				desc: "Gateway state",
				states: {
					0: "TestMode",
					1: "GatewayMode_NoActuatorNodes",
					2: "GatewayMode_WithActuatorNodes",
					3: "BeaconMode_NotConfigured",
					4: "BeaconMode_Configured",
				},
			},
			{},
			gatewayState.GatewayState,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			"gateway.GatewaySubState",
			{
				name: "GatewaySubState",
				role: "value",
				type: "number",
				min: 0,
				max: 255,
				def: 0,
				read: true,
				write: false,
				desc: "Gateway sub state",
				states: {
					0: "Idle",
					1: "RunningConfigurationService",
					2: "RunningSceneConfiguration",
					3: "RunningInformationServiceConfiguration",
					4: "RunningContactInputConfiguration",
					128: "RunningCommand",
					129: "RunningActivateGroup",
					130: "RunningActivateScene",
				},
			},
			{},
			gatewayState.SubState,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			"gateway.RebootGateway",
			{
				name: "RebootGateway",
				role: "button.stop",
				type: "boolean",
				read: false,
				write: true,
				desc: "Reboot the gateway (this one only works, if there is still a connection to the gateway possible)",
			},
			{},
			false,
		);

		// Setup gateway listeners
		const rebootListener = new ComplexStateChangeHandler(adapter, `gateway.RebootGateway`, async state => {
			if (state !== undefined) {
				if (state?.val === true) {
					// Reboot, login should be done automatically by the existing logic for loss of connection
					newSetup.adapter.log.info("Rebooting the adapter, connection will be lost.");
					await gateway.rebootAsync();
					newSetup.adapter.log.info("Waiting 2 seconds after reboot for restart.");
					await new Promise(resolve => setTimeout(resolve, 2000));
					newSetup.adapter.log.info("Adapter will be restartet.");
					newSetup.adapter.restart();
				}
			}
		});
		await rebootListener.Initialize();
		newSetup.disposableEvents.push(rebootListener);

		return newSetup;
	}
}
