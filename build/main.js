"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_klf_200_api = require("klf-200-api");
var import_node_schedule = require("node-schedule");
var import_disposalMap = require("./disposalMap.js");
var import_setup = require("./setup.js");
var import_setupGroups = require("./setupGroups.js");
var import_setupProducts = require("./setupProducts.js");
var import_setupScenes = require("./setupScenes.js");
var import_utils = require("./util/utils.js");
class Klf200 extends utils.Adapter {
  disposables = [];
  connectionWatchDogHandler;
  InShutdown;
  disposalMap = new import_disposalMap.DisposalMap();
  _Connection;
  get Connection() {
    return this._Connection;
  }
  _Gateway;
  get Gateway() {
    return this._Gateway;
  }
  _Groups;
  get Groups() {
    return this._Groups;
  }
  _Scenes;
  get Scenes() {
    return this._Scenes;
  }
  _Products;
  get Products() {
    return this._Products;
  }
  _Setup;
  get Setup() {
    return this._Setup;
  }
  _RebootJob;
  constructor(options = {}) {
    super({
      ...options,
      name: "klf200"
    });
    process.on("unhandledRejection", this.onUnhandledRejection.bind(this));
    process.on("uncaughtException", this.onUnhandledError.bind(this));
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.InShutdown = false;
    this.connectionWatchDogHandler = (hadError) => {
      (async () => {
        await this.ConnectionWatchDog(hadError);
      })().catch((reason) => {
        this.log.error(`Error occured in connection watch dog handler: ${JSON.stringify(reason)}`);
      });
    };
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    var _a;
    try {
      await this.setState("info.connection", false, true);
      if (!this.supportsFeature || !this.supportsFeature("ADAPTER_AUTO_DECRYPT_NATIVE")) {
        this.config.password = this.decrypt(this.config.password);
      }
      if (!this.config.advancedSSLConfiguration) {
        this._Connection = new import_klf_200_api.Connection(this.config.host);
      } else {
        this._Connection = new import_klf_200_api.Connection(
          this.config.host,
          Buffer.from(this.config.SSLPublicKey),
          this.config.SSLFingerprint
        );
      }
      this.log.info(`Host: ${this.config.host}`);
      try {
        await ((_a = this.Connection) == null ? void 0 : _a.loginAsync(this.config.password));
      } catch (error) {
        this.log.error(`${error}`);
        this.log.debug(`${error.stack}`);
        this.terminate(`Login to KLF-200 device at ${this.config.host} failed.`);
        return;
      }
      this.log.info("Connected to interface.");
      await this.initializeOnConnection();
      if (this.config.enableAutomaticReboot === true) {
        this.log.info("Automatic reboot enabled in configuration. Planning reboot job.");
        this._RebootJob = (0, import_node_schedule.scheduleJob)(this.config.automaticRebootCronTime, this.onReboot.bind(this));
      } else {
        this.log.info("Automatic reboot disabled in configuration.");
      }
      await this.setState("info.connection", true, true);
    } catch (e) {
      this.log.error(`Error during initialization of the adapter.`);
      const result = (0, import_utils.convertErrorToString)(e);
      this.log.error(result);
      if (e instanceof Error && e.stack) {
        this.log.debug(e.stack);
      }
      this.terminate ? this.terminate(result) : process.exit(1);
    }
  }
  async initializeOnConnection() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    this.log.info(`Setting up notification handler for gateway state...`);
    this.disposables.push(
      this._Connection.on(this.onFrameReceived.bind(this)),
      this._Connection.onFrameSent(this.onFrameSent.bind(this))
    );
    this.log.info(`Reading device information...`);
    this._Gateway = new import_klf_200_api.Gateway(this.Connection);
    this.log.info(`Enabling the house status monitor...`);
    await ((_a = this.Gateway) == null ? void 0 : _a.enableHouseStatusMonitorAsync());
    this.log.info(`Setting UTC clock to the current time.`);
    await ((_b = this.Gateway) == null ? void 0 : _b.setUTCDateTimeAsync());
    this.log.info(`Setting time zone to :GMT+1:GMT+2:0060:(1994)040102-0:110102-0`);
    await ((_c = this.Gateway) == null ? void 0 : _c.setTimeZoneAsync(":GMT+1:GMT+2:0060:(1994)040102-0:110102-0"));
    this.log.info(`Reading scenes...`);
    this._Scenes = await import_klf_200_api.Scenes.createScenesAsync(this.Connection);
    this.log.info(`${(0, import_utils.ArrayCount)(this.Scenes.Scenes)} scenes found.`);
    this.log.info(`Reading groups...`);
    this._Groups = await import_klf_200_api.Groups.createGroupsAsync(this.Connection);
    this.log.info(`${(0, import_utils.ArrayCount)(this.Groups.Groups)} groups found.`);
    this.log.info(`Reading products...`);
    this._Products = await import_klf_200_api.Products.createProductsAsync(this.Connection);
    this.log.info(`${(0, import_utils.ArrayCount)(this.Products.Products)} products found.`);
    this.log.info(`Reading product limitations...`);
    const productLimitationError = /* @__PURE__ */ new Set();
    for (const product of this._Products.Products) {
      for (const limitationType of [import_klf_200_api.LimitationType.MinimumLimitation, import_klf_200_api.LimitationType.MaximumLimitation]) {
        for (const parameterActive of [
          import_klf_200_api.ParameterActive.MP,
          import_klf_200_api.ParameterActive.FP1,
          import_klf_200_api.ParameterActive.FP2,
          import_klf_200_api.ParameterActive.FP3,
          import_klf_200_api.ParameterActive.FP4
        ]) {
          try {
            await product.refreshLimitationAsync(limitationType, parameterActive);
          } catch (error) {
            if (error instanceof Error && (error.message.startsWith("Unexpected node ID") || error.message.startsWith("Unexpected parameter ID"))) {
              productLimitationError.add(JSON.stringify([product.NodeID, parameterActive]));
            } else {
              throw error;
            }
          }
        }
      }
    }
    this._Setup = await import_setup.Setup.setupGlobalAsync(this, this.Gateway);
    this.disposables.push(this._Setup);
    await import_setupScenes.SetupScenes.createScenesAsync(this, this.Scenes, this.disposalMap);
    await import_setupGroups.SetupGroups.createGroupsAsync(
      this,
      (_e = (_d = this.Groups) == null ? void 0 : _d.Groups) != null ? _e : [],
      (_g = (_f = this.Products) == null ? void 0 : _f.Products) != null ? _g : [],
      this.disposalMap
    );
    await import_setupProducts.SetupProducts.createProductsAsync(
      this,
      (_i = (_h = this.Products) == null ? void 0 : _h.Products) != null ? _i : [],
      this.disposalMap,
      productLimitationError
    );
    this.log.info(`Setting up notification handlers for removal...`);
    this.disposables.push(
      this.Scenes.onRemovedScene(this.onRemovedScene.bind(this)),
      this.Products.onRemovedProduct(this.onRemovedProduct.bind(this)),
      this.Groups.onRemovedGroup(this.onRemovedGroup.bind(this))
    );
    this.log.info(`Setting up notification handlers for discovering new objects...`);
    this.disposables.push(
      this.Scenes.onAddedScene(this.onNewScene.bind(this)),
      this.Products.onNewProduct(this.onNewProduct.bind(this)),
      this.Groups.onChangedGroup(this.onNewGroup.bind(this))
    );
    this.log.info(`Adapter is ready for use.`);
    this.log.info(`Starting background state refresher...`);
    (_j = this._Setup) == null ? void 0 : _j.startStateTimer();
    (_l = (_k = this.Connection) == null ? void 0 : _k.KLF200SocketProtocol) == null ? void 0 : _l.socket.on("close", this.connectionWatchDogHandler);
  }
  async disposeOnConnectionClosed() {
    var _a, _b;
    this.log.info(`Remove socket listener...`);
    (_b = (_a = this.Connection) == null ? void 0 : _a.KLF200SocketProtocol) == null ? void 0 : _b.socket.off("close", this.connectionWatchDogHandler);
    this.log.info(`Shutting down event handlers...`);
    this.disposables.forEach((disposable) => {
      disposable.dispose();
    });
    await this.disposalMap.disposeAll();
  }
  async ConnectionWatchDog(hadError) {
    var _a, _b;
    (_a = this._Setup) == null ? void 0 : _a.stopStateTimer();
    await this.setState("info.connection", false, true);
    this.log.warn("Lost connection to KLF-200");
    if (hadError === true) {
      this.log.error("The underlying connection has been closed due to some error.");
    }
    await this.disposeOnConnectionClosed();
    this.log.info("Trying to reconnect...");
    let isConnected = false;
    while (!isConnected && !this.InShutdown) {
      try {
        await ((_b = this.Connection) == null ? void 0 : _b.loginAsync(this.config.password));
        isConnected = true;
        this.log.info("Reconnected.");
        await this.setState("info.connection", true, true);
        await this.initializeOnConnection();
      } catch (e) {
        this.log.error(`Login to KLF-200 device at ${this.config.host} failed.`);
        const result = (0, import_utils.convertErrorToString)(e);
        this.log.error(result);
        await this.delay(1e3);
      }
    }
  }
  async onRemovedScene(sceneId) {
    const sceneStateId = `scenes.${sceneId}`;
    await this.disposalMap.disposeId(sceneStateId);
    await this.delObjectAsync(sceneStateId, { recursive: true });
  }
  async onRemovedProduct(productId) {
    const productStateId = `products.${productId}`;
    await this.disposalMap.disposeId(productStateId);
    await this.delObjectAsync(productStateId, { recursive: true });
  }
  async onRemovedGroup(groupId) {
    const groupStateId = `groups.${groupId}`;
    await this.disposalMap.disposeId(groupStateId);
    await this.delObjectAsync(groupStateId, { recursive: true });
  }
  async onNewScene(sceneId) {
    var _a;
    const newScene = (_a = this._Scenes) == null ? void 0 : _a.Scenes[sceneId];
    if (newScene) {
      await import_setupScenes.SetupScenes.createSceneAsync(this, newScene, this.disposalMap);
    }
  }
  async onNewProduct(productId) {
    var _a;
    const newProduct = (_a = this._Products) == null ? void 0 : _a.Products[productId];
    if (newProduct) {
      const productLimitationError = /* @__PURE__ */ new Set();
      for (const limitationType of [import_klf_200_api.LimitationType.MinimumLimitation, import_klf_200_api.LimitationType.MaximumLimitation]) {
        for (const parameterActive of [
          import_klf_200_api.ParameterActive.MP,
          import_klf_200_api.ParameterActive.FP1,
          import_klf_200_api.ParameterActive.FP2,
          import_klf_200_api.ParameterActive.FP3,
          import_klf_200_api.ParameterActive.FP4
        ]) {
          try {
            await newProduct.refreshLimitationAsync(limitationType, parameterActive);
          } catch (error) {
            if (error instanceof Error && (error.message.startsWith("Unexpected node ID") || error.message.startsWith("Unexpected parameter ID"))) {
              productLimitationError.add(JSON.stringify([newProduct.NodeID, parameterActive]));
            } else {
              throw error;
            }
          }
        }
      }
      await import_setupProducts.SetupProducts.createProductAsync(this, newProduct, this.disposalMap, productLimitationError);
    }
  }
  async onNewGroup(groupId) {
    var _a;
    const newGroup = (_a = this._Groups) == null ? void 0 : _a.Groups[groupId];
    if (newGroup && this._Products) {
      await import_setupGroups.SetupGroups.createGroupAsync(this, newGroup, this._Products.Products, this.disposalMap);
    }
  }
  async onFrameReceived(frame) {
    var _a;
    this.log.debug(`Frame received (${import_klf_200_api.GatewayCommand[frame.Command]}): ${this.stringifyFrame(frame)}`);
    if (!(frame instanceof import_klf_200_api.GW_GET_STATE_CFM) && !(frame instanceof import_klf_200_api.GW_REBOOT_CFM)) {
      await ((_a = this.Setup) == null ? void 0 : _a.stateTimerHandler(this, this.Gateway));
    }
  }
  async onFrameSent(frame) {
    this.log.debug(`Frame sent (${import_klf_200_api.GatewayCommand[frame.Command]}): ${this.stringifyFrame(frame)}`);
    return Promise.resolve();
  }
  stringifyFrame(frame) {
    return JSON.stringify(frame, (key, value) => {
      if (key.match(/password/i)) {
        return "**********";
      } else {
        return value;
      }
    });
  }
  async onReboot() {
    var _a;
    this.log.info("Automatic reboot due to schedule in configuration");
    (_a = this.Setup) == null ? void 0 : _a.stopStateTimer();
    await this.setState(`gateway.RebootGateway`, true, false);
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   */
  async onUnload(callback) {
    var _a;
    try {
      this.InShutdown = true;
      await this.disposeOnConnectionClosed();
      this.log.info(`Disconnecting from the KLF-200...`);
      await ((_a = this.Connection) == null ? void 0 : _a.logoutAsync());
      this.log.info("Cleaned everything up...");
      callback();
    } catch (e) {
      this.log.error(`Error during unload: ${JSON.stringify(e)}`);
      callback();
    }
  }
  // /**
  //  * Is called if a subscribed object changes
  //  */
  // private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
  // 	if (obj) {
  // 		// The object was changed
  // 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
  // 	} else {
  // 		// The object was deleted
  // 		this.log.info(`object ${id} deleted`);
  // 	}
  // }
  /**
   * Is called if a subscribed state changes
   */
  onStateChange(id, state) {
    if (state) {
      this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
      this.log.debug(`state ${id} deleted`);
    }
  }
  // /**
  //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
  //  * Using this method requires "common.message" property to be set to true in io-package.json
  //  */
  // private onMessage(obj: ioBroker.Message): void {
  // 	if (typeof obj === "object" && obj.message) {
  // 		if (obj.command === "send") {
  // 			// e.g. send email or pushover or whatever
  // 			this.log.info("send command");
  // 			// Send response in callback if required
  // 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
  // 		}
  // 	}
  // }
  getErrorMessage(err) {
    if (err == null)
      return "undefined";
    if (typeof err === "string")
      return err;
    if (err.message != null)
      return err.message;
    if (err.name != null)
      return err.name;
    return err.toString();
  }
  onUnhandledRejection(reason, promise) {
    (this && this.log || console).error(
      `Unhandled promise rejection detected. reason: ${JSON.stringify(reason)}, promise: ${JSON.stringify(
        promise
      )}`
    );
    this.terminate("unhandled promise rejection", 1);
  }
  onUnhandledError(error) {
    (this && this.log || console).error(`Unhandled exception occured: ${JSON.stringify(error)}`);
    this.terminate("unhandled exception", 1);
  }
}
if (require.main !== module) {
  module.exports = (options) => new Klf200(options);
} else {
  (() => new Klf200())();
}
//# sourceMappingURL=main.js.map
