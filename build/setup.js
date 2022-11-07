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
var setup_exports = {};
__export(setup_exports, {
  Setup: () => Setup
});
module.exports = __toCommonJS(setup_exports);
var import_promise_timeout = require("promise-timeout");
var import_propertyLink = require("./util/propertyLink");
var import_stateHelper = require("./util/stateHelper");
class Setup {
  constructor(adapter, gateway) {
    this.adapter = adapter;
    this.gateway = gateway;
    this.disposableEvents = [];
    this.stateTimerHandlerActive = false;
  }
  dispose() {
    this.stopStateTimer();
    this.disposableEvents.forEach((disposable) => {
      disposable.dispose();
    });
  }
  startStateTimer() {
    if (this._stateTimer === void 0) {
      this._stateTimer = setTimeout(
        async (adapter, gateway) => {
          this._stateTimer = void 0;
          await this.stateTimerHandler(adapter, gateway);
        },
        5 * 60 * 1e3,
        this.adapter,
        this.gateway
      );
    }
  }
  stopStateTimer() {
    if (this._stateTimer !== void 0) {
      try {
        clearTimeout(this._stateTimer);
      } finally {
        this._stateTimer = void 0;
      }
    }
  }
  async stateTimerHandler(adapter, gateway) {
    this.stopStateTimer();
    try {
      if (!this.stateTimerHandlerActive) {
        this.stateTimerHandlerActive = true;
        try {
          const GatewayState = await gateway.getStateAsync();
          await adapter.setStateChangedAsync("gateway.GatewayState", GatewayState.GatewayState, true);
          await adapter.setStateChangedAsync("gateway.GatewaySubState", GatewayState.SubState, true);
        } catch (e) {
          if (e instanceof import_promise_timeout.TimeoutError) {
            adapter.log.error(`Timemout occured during getting the current gateway status.`);
          } else {
            adapter.log.error(`Error occured during getting the current gateway status.`);
            adapter.log.error(`Error details: ${e}`);
          }
        } finally {
          this.stateTimerHandlerActive = false;
        }
      }
    } finally {
      if (gateway.connection.KLF200SocketProtocol !== void 0) {
        this.startStateTimer();
      }
    }
  }
  static async setupGlobalAsync(adapter, gateway) {
    const newSetup = new Setup(adapter, gateway);
    await adapter.setObjectNotExistsAsync("products", {
      type: "device",
      common: {
        name: "products"
      },
      native: {}
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
        desc: "Number of products connected to the interface"
      },
      native: {}
    });
    await adapter.setObjectNotExistsAsync("scenes", {
      type: "device",
      common: {
        name: "scenes"
      },
      native: {}
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
        desc: "Number of scenes defined in the interface"
      },
      native: {}
    });
    await adapter.setObjectNotExistsAsync("groups", {
      type: "device",
      common: {
        name: "groups"
      },
      native: {}
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
        desc: "Number of groups defined in the interface"
      },
      native: {}
    });
    await adapter.setObjectNotExistsAsync("gateway", {
      type: "device",
      common: {
        name: "gateway"
      },
      native: {}
    });
    const ProtocolVersion = await gateway.getProtocolVersionAsync();
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      "gateway.ProtocolVersion",
      {
        name: "Protocol version",
        role: "value",
        type: "string",
        def: "",
        read: true,
        write: false,
        desc: "Version of the protocol with which the software of the gateway is compatible"
      },
      {},
      `${ProtocolVersion.MajorVersion}.${ProtocolVersion.MinorVersion}`
    );
    const Version = await gateway.getVersionAsync();
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      "gateway.SoftwareVersion",
      {
        name: "SoftwareVersion",
        role: "value",
        type: "string",
        def: "",
        read: true,
        write: false,
        desc: "Software version number"
      },
      {},
      `${Version.SoftwareVersion.CommandVersion}.${Version.SoftwareVersion.MainVersion}.${Version.SoftwareVersion.SubVersion}.${Version.SoftwareVersion.BranchID}.${Version.SoftwareVersion.Build}.${Version.SoftwareVersion.MicroBuild}`
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      "gateway.HardwareVersion",
      {
        name: "HardwareVersion",
        role: "value",
        type: "number",
        def: "",
        read: true,
        write: false,
        desc: "Hardware version number"
      },
      {},
      Version.HardwareVersion
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      "gateway.ProductGroup",
      {
        name: "ProductGroup",
        role: "value",
        type: "number",
        def: "",
        read: true,
        write: false,
        desc: "Product group"
      },
      {},
      Version.ProductGroup
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      "gateway.ProductType",
      {
        name: "ProductType",
        role: "value",
        type: "number",
        def: "",
        read: true,
        write: false,
        desc: "Product type"
      },
      {},
      Version.ProductType
    );
    const gatewayState = await gateway.getStateAsync();
    await import_stateHelper.StateHelper.createAndSetStateAsync(
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
          "4": "BeaconMode_Configured"
        }
      },
      {},
      gatewayState.GatewayState
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
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
          "130": "RunningActivateScene"
        }
      },
      {},
      gatewayState.SubState
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      "gateway.RebootGateway",
      {
        name: "RebootGateway",
        role: "button.stop",
        type: "boolean",
        read: false,
        write: true,
        desc: "Reboot the gateway (this one only works, if there is still a connection to the gateway possible)"
      },
      {},
      false
    );
    const rebootListener = new import_propertyLink.ComplexStateChangeHandler(adapter, `gateway.RebootGateway`, async (state) => {
      if (state !== void 0) {
        if ((state == null ? void 0 : state.val) === true) {
          newSetup.adapter.log.info("Rebooting the adapter, connection will be lost.");
          await gateway.rebootAsync();
          newSetup.adapter.log.info("Waiting 2 seconds after reboot for restart.");
          await new Promise((resolve) => setTimeout(resolve, 2e3));
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Setup
});
//# sourceMappingURL=setup.js.map
