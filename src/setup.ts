"use strict";

import { Gateway } from "klf-200-api";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";
import { StateHelper } from "./util/stateHelper";

export class Setup implements Disposable {
	constructor(readonly adapter: ioBroker.Adapter, readonly gateway: Gateway) {}

	private disposableEvents: Disposable[] = [];

	dispose(): void {
		this.stopStateTimer();
		this.disposableEvents.forEach((disposable) => {
			disposable.dispose();
		});
	}

	private _stateTimer?: ReturnType<typeof setInterval>;

	public startStateTimer(): void {
		if (this._stateTimer === undefined) {
			this._stateTimer = setInterval(
				async (adapter, gateway) => {
					await this.stateTimerHandler(adapter, gateway);
				},
				10000,
				this.adapter,
				this.gateway,
			);
		}
	}

	public stopStateTimer(): void {
		if (this._stateTimer !== undefined) {
			clearInterval(this._stateTimer);
			this._stateTimer = undefined;
		}
	}

	private async stateTimerHandler(adapter: ioBroker.Adapter, gateway: Gateway): Promise<void> {
		const GatewayState = await gateway.getStateAsync();
		await adapter.setStateChangedAsync("gateway.GatewayState", GatewayState.GatewayState, true);
		await adapter.setStateChangedAsync("gateway.GatewaySubState", GatewayState.SubState, true);
	}

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
				def: "",
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
				def: "",
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
				def: "",
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
					"0": "TestMode",
					"1": "GatewayMode_NoActuatorNodes",
					"2": "GatewayMode_WithActuatorNodes",
					"3": "BeaconMode_NotConfigured",
					"4": "BeaconMode_Configured",
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
					"0": "Idle",
					"1": "RunningConfigurationService",
					"2": "RunningSceneConfiguration",
					"3": "RunningInformationServiceConfiguration",
					"4": "RunningContactInputConfiguration",
					"128": "RunningCommand",
					"129": "RunningActivateGroup",
					"130": "RunningActivateScene",
				},
			},
			{},
			gatewayState.SubState,
		);

		return newSetup;
	}
}
