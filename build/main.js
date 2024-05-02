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
var import_setup = require("./setup");
var import_setupGroups = require("./setupGroups");
var import_setupProducts = require("./setupProducts");
var import_setupScenes = require("./setupScenes");
var import_utils = require("./util/utils");
class Klf200 extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "klf200"
    });
    this.disposables = [];
    process.on("unhandledRejection", this.onUnhandledRejection.bind(this));
    process.on("uncaughtException", this.onUnhandledError.bind(this));
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.InShutdown = false;
    this.connectionWatchDogHandler = this.ConnectionWatchDog.bind(this);
  }
  get Connection() {
    return this._Connection;
  }
  get Gateway() {
    return this._Gateway;
  }
  get Groups() {
    return this._Groups;
  }
  get Scenes() {
    return this._Scenes;
  }
  get Products() {
    return this._Products;
  }
  get Setup() {
    return this._Setup;
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    var _a;
    try {
      await this.setStateAsync("info.connection", false, true);
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
      await this.setStateAsync("info.connection", true, true);
    } catch (e) {
      this.log.error(`Error during initialization of the adapter.`);
      const result = (0, import_utils.convertErrorToString)(e);
      this.log.error(result);
      this.terminate ? this.terminate(result) : process.exit(1);
    }
  }
  async initializeOnConnection() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
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
    this._Setup = await import_setup.Setup.setupGlobalAsync(this, this.Gateway);
    this.disposables.push(this._Setup);
    this.disposables.push(...await import_setupScenes.SetupScenes.createScenesAsync(this, this.Scenes));
    this.disposables.push(
      ...await import_setupGroups.SetupGroups.createGroupsAsync(this, (_e = (_d = this.Groups) == null ? void 0 : _d.Groups) != null ? _e : [], (_g = (_f = this.Products) == null ? void 0 : _f.Products) != null ? _g : [])
    );
    this.disposables.push(...await import_setupProducts.SetupProducts.createProductsAsync(this, (_i = (_h = this.Products) == null ? void 0 : _h.Products) != null ? _i : []));
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
    this.log.info(`Setting up notification handler for gateway state...`);
    this.disposables.push(this._Connection.on(this.onFrameReceived.bind(this)));
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
  }
  async ConnectionWatchDog(hadError) {
    var _a, _b;
    (_a = this._Setup) == null ? void 0 : _a.stopStateTimer();
    await this.setStateAsync("info.connection", false, true);
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
        await this.setStateAsync("info.connection", true, true);
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
    await this.deleteChannelAsync(`scenes`, `${sceneId}`);
  }
  async onRemovedProduct(productId) {
    await this.deleteChannelAsync(`products`, `${productId}`);
  }
  async onRemovedGroup(groupId) {
    await this.deleteChannelAsync(`groups`, `${groupId}`);
  }
  async onNewScene(sceneId) {
    var _a;
    const newScene = (_a = this._Scenes) == null ? void 0 : _a.Scenes[sceneId];
    if (newScene) {
      return await import_setupScenes.SetupScenes.createSceneAsync(this, newScene);
    } else {
      return [];
    }
  }
  async onNewProduct(productId) {
    var _a;
    const newProduct = (_a = this._Products) == null ? void 0 : _a.Products[productId];
    if (newProduct) {
      return await import_setupProducts.SetupProducts.createProductAsync(this, newProduct);
    } else {
      return [];
    }
  }
  async onNewGroup(groupId) {
    var _a;
    const newGroup = (_a = this._Groups) == null ? void 0 : _a.Groups[groupId];
    if (newGroup && this._Products) {
      return await import_setupGroups.SetupGroups.createGroupAsync(this, newGroup, this._Products.Products);
    } else {
      return [];
    }
  }
  async onFrameReceived(frame) {
    var _a;
    this.log.debug(`Frame received: ${JSON.stringify(frame)}`);
    if (!(frame instanceof import_klf_200_api.GW_GET_STATE_CFM) && !(frame instanceof import_klf_200_api.GW_REBOOT_CFM)) {
      await ((_a = this.Setup) == null ? void 0 : _a.stateTimerHandler(this, this.Gateway));
    }
  }
  async onReboot() {
    var _a;
    this.log.info("Automatic reboot due to schedule in configuration");
    (_a = this.Setup) == null ? void 0 : _a.stopStateTimer();
    await this.setStateAsync(`gateway.RebootGateway`, true, false);
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
    (this && this.log || console).error(`Unhandled exception occured: ${error}`);
    this.terminate("unhandled exception", 1);
  }
}
if (require.main !== module) {
  module.exports = (options) => new Klf200(options);
} else {
  (() => new Klf200())();
}
//# sourceMappingURL=main.js.map
