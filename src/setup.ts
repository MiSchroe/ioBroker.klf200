"use strict";

export class Setup {
	public static async setupGlobalAsync(adapter: ioBroker.Adapter): Promise<void> {
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
		await adapter.setObjectNotExistsAsync("gateway.ProtocolVersion", {
			type: "state",
			common: {
				name: "Protocol version",
				role: "value",
				type: "string",
				def: "",
				read: true,
				write: false,
				desc: "Version of the protocol with which the software of the gateway is compatible",
			},
			native: {},
		});
		await adapter.setObjectNotExistsAsync("gateway.Version", {
			type: "state",
			common: {
				name: "Version",
				role: "value",
				type: "string",
				def: "",
				read: true,
				write: false,
				desc: "Firmware version number",
			},
			native: {},
		});
		await adapter.setObjectNotExistsAsync("gateway.GatewayState", {
			type: "state",
			common: {
				name: "GatewayState",
				role: "value",
				type: "number",
				min: 0,
				max: 255,
				def: 0,
				read: true,
				write: false,
				desc: "Gateway state",
			},
			native: {},
		});
		await adapter.setObjectNotExistsAsync("gateway.GatewaySubState", {
			type: "state",
			common: {
				name: "GatewaySubState",
				role: "value",
				type: "number",
				min: 0,
				max: 255,
				def: 0,
				read: true,
				write: false,
				desc: "Gateway sub state",
			},
			native: {},
		});
	}
}
