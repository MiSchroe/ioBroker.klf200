"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stateHelper_1 = require("./util/stateHelper");
class Setup {
    static async setupGlobalAsync(adapter, gateway) {
        const disposableEvents = [];
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
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, "gateway.ProtocolVersion", {
            name: "Protocol version",
            role: "value",
            type: "string",
            def: "",
            read: true,
            write: false,
            desc: "Version of the protocol with which the software of the gateway is compatible",
        }, {}, `${ProtocolVersion.MajorVersion}.${ProtocolVersion.MinorVersion}`);
        const Version = await gateway.getVersionAsync();
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, "gateway.Version", {
            name: "Version",
            role: "value",
            type: "string",
            def: "",
            read: true,
            write: false,
            desc: "Firmware version number",
        }, {}, JSON.stringify(Version));
        const GatewayState = await gateway.getStateAsync();
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, "gateway.GatewayState", {
            name: "GatewayState",
            role: "value",
            type: "number",
            min: 0,
            max: 255,
            def: 0,
            read: true,
            write: false,
            desc: "Gateway state",
        }, {}, GatewayState.GatewayState);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, "gateway.GatewaySubState", {
            name: "GatewaySubState",
            role: "value",
            type: "number",
            min: 0,
            max: 255,
            def: 0,
            read: true,
            write: false,
            desc: "Gateway sub state",
        }, {}, GatewayState.SubState);
        // Start a 10 seconds interval timer to refresh the gateway status.
        // This interval timer has to be cleaned up on exit.
        const stateTimer = {
            Timer: setInterval(async (adapter, gateway) => {
                const GatewayState = await gateway.getStateAsync();
                await adapter.setStateChangedAsync("gateway.GatewayState", GatewayState.GatewayState, true);
                await adapter.setStateChangedAsync("gateway.GatewaySubState", GatewayState.SubState, true);
            }, 10000, adapter, gateway),
            dispose: () => {
                clearInterval(stateTimer.Timer);
            },
        };
        disposableEvents.push(stateTimer);
        return disposableEvents;
    }
}
exports.Setup = Setup;
//# sourceMappingURL=setup.js.map