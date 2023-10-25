"use strict";
/*
 * Created with @iobroker/create-adapter v1.16.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = __importStar(require("@iobroker/adapter-core"));
const klf_200_api_1 = require("klf-200-api");
const node_schedule_1 = require("node-schedule");
const setup_1 = require("./setup");
const setupGroups_1 = require("./setupGroups");
const setupProducts_1 = require("./setupProducts");
const setupScenes_1 = require("./setupScenes");
const utils_1 = require("./util/utils");
class Klf200 extends utils.Adapter {
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
    constructor(options = {}) {
        super({
            ...options,
            name: "klf200",
        });
        this.disposables = [];
        // Trace unhandled errors
        process.on("unhandledRejection", this.onUnhandledRejection.bind(this));
        process.on("uncaughtException", this.onUnhandledError.bind(this));
        this.on("ready", this.onReady.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
        // Setup connection watchdog handler
        this.InShutdown = false;
        this.connectionWatchDogHandler = this.ConnectionWatchDog.bind(this);
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        try {
            // Initialize your adapter here
            // Reset the connection indicator during startup
            await this.setStateAsync("info.connection", false, true);
            // Decrypt password
            if (!this.supportsFeature || !this.supportsFeature("ADAPTER_AUTO_DECRYPT_NATIVE")) {
                this.config.password = this.decrypt(this.config.password);
            }
            // Setup connection and initialize objects and states
            if (!this.config.advancedSSLConfiguration) {
                this._Connection = new klf_200_api_1.Connection(this.config.host);
            }
            else {
                this._Connection = new klf_200_api_1.Connection(this.config.host, Buffer.from(this.config.SSLPublicKey), this.config.SSLFingerprint);
            }
            this.log.info(`Host: ${this.config.host}`);
            try {
                await this.Connection?.loginAsync(this.config.password);
            }
            catch (error) {
                this.terminate(`Login to KLF-200 device at ${this.config.host} failed.`);
                return;
            }
            this.log.info("Connected to interface.");
            // Read data from the gateway and setup states and handlers
            await this.initializeOnConnection();
            // Set up reboot schedule, if enabled
            if (this.config.enableAutomaticReboot === true) {
                this.log.info("Automatic reboot enabled in configuration. Planning reboot job.");
                this._RebootJob = (0, node_schedule_1.scheduleJob)(this.config.automaticRebootCronTime, this.onReboot.bind(this));
            }
            else {
                this.log.info("Automatic reboot disabled in configuration.");
            }
            // Set the connection indicator to true
            await this.setStateAsync("info.connection", true, true);
        }
        catch (e) {
            this.log.error(`Error during initialization of the adapter.`);
            const result = (0, utils_1.convertErrorToString)(e);
            this.log.error(result);
            this.terminate ? this.terminate(result) : process.exit(1);
        }
    }
    async initializeOnConnection() {
        // Read device info, scenes, groups and products and setup device
        this.log.info(`Reading device information...`);
        this._Gateway = new klf_200_api_1.Gateway(this.Connection);
        this.log.info(`Enabling the house status monitor...`);
        await this.Gateway?.enableHouseStatusMonitorAsync();
        this.log.info(`Setting UTC clock to the current time.`);
        await this.Gateway?.setUTCDateTimeAsync();
        this.log.info(`Setting time zone to :GMT+1:GMT+2:0060:(1994)040102-0:110102-0`);
        await this.Gateway?.setTimeZoneAsync(":GMT+1:GMT+2:0060:(1994)040102-0:110102-0");
        this.log.info(`Reading scenes...`);
        this._Scenes = await klf_200_api_1.Scenes.createScenesAsync(this.Connection);
        this.log.info(`${(0, utils_1.ArrayCount)(this.Scenes.Scenes)} scenes found.`);
        this.log.info(`Reading groups...`);
        this._Groups = await klf_200_api_1.Groups.createGroupsAsync(this.Connection);
        this.log.info(`${(0, utils_1.ArrayCount)(this.Groups.Groups)} groups found.`);
        this.log.info(`Reading products...`);
        this._Products = await klf_200_api_1.Products.createProductsAsync(this.Connection);
        this.log.info(`${(0, utils_1.ArrayCount)(this.Products.Products)} products found.`);
        // Setup states
        this._Setup = await setup_1.Setup.setupGlobalAsync(this, this.Gateway);
        this.disposables.push(this._Setup);
        this.disposables.push(...(await setupScenes_1.SetupScenes.createScenesAsync(this, this.Scenes?.Scenes ?? [])));
        this.disposables.push(...(await setupGroups_1.SetupGroups.createGroupsAsync(this, this.Groups?.Groups ?? [], this.Products?.Products ?? [])));
        this.disposables.push(...(await setupProducts_1.SetupProducts.createProductsAsync(this, this.Products?.Products ?? [])));
        this.log.info(`Setting up notification handlers for removal...`);
        // Setup remove notification
        this.disposables.push(this.Scenes.onRemovedScene(this.onRemovedScene.bind(this)), this.Products.onRemovedProduct(this.onRemovedProduct.bind(this)), this.Groups.onRemovedGroup(this.onRemovedGroup.bind(this)));
        this.log.info(`Setting up notification handlers for discovering new objects...`);
        this.disposables.push(this.Products.onNewProduct(this.onNewProduct.bind(this)), this.Groups.onChangedGroup(this.onNewGroup.bind(this)));
        this.log.info(`Setting up notification handler for gateway state...`);
        this.disposables.push(this._Connection.on(this.onFrameReceived.bind(this)));
        // Write a finish setup log entry
        this.log.info(`Adapter is ready for use.`);
        // Start state timer
        this.log.info(`Starting background state refresher...`);
        this._Setup?.startStateTimer();
        this.Connection?.KLF200SocketProtocol?.socket.on("close", this.connectionWatchDogHandler);
    }
    async disposeOnConnectionClosed() {
        // Remove watchdog handler from socket
        this.log.info(`Remove socket listener...`);
        this.Connection?.KLF200SocketProtocol?.socket.off("close", this.connectionWatchDogHandler);
        // Disconnect all event handlers
        this.log.info(`Shutting down event handlers...`);
        this.disposables.forEach((disposable) => {
            disposable.dispose();
        });
    }
    async ConnectionWatchDog(hadError) {
        // Stop the state timer first
        this._Setup?.stopStateTimer();
        // Reset the connection indicator
        await this.setStateAsync("info.connection", false, true);
        this.log.warn("Lost connection to KLF-200");
        if (hadError === true) {
            this.log.error("The underlying connection has been closed due to some error.");
        }
        // Clean up
        await this.disposeOnConnectionClosed();
        // Try to reconnect
        this.log.info("Trying to reconnect...");
        let isConnected = false;
        while (!isConnected && !this.InShutdown) {
            try {
                await this.Connection?.loginAsync(this.config.password);
                isConnected = true;
                this.log.info("Reconnected.");
                await this.setStateAsync("info.connection", true, true);
                await this.initializeOnConnection();
            }
            catch (e) {
                this.log.error(`Login to KLF-200 device at ${this.config.host} failed.`);
                const result = (0, utils_1.convertErrorToString)(e);
                this.log.error(result);
                // Wait a second before retry
                await this.delay(1000);
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
    async onNewProduct(productId) {
        const newProduct = this._Products?.Products[productId];
        if (newProduct) {
            return await setupProducts_1.SetupProducts.createProductAsync(this, newProduct);
        }
        else {
            return [];
        }
    }
    async onNewGroup(groupId) {
        const newGroup = this._Groups?.Groups[groupId];
        if (newGroup && this._Products) {
            return await setupGroups_1.SetupGroups.createGroupAsync(this, newGroup, this._Products.Products);
        }
        else {
            return [];
        }
    }
    async onFrameReceived(frame) {
        this.log.debug(`Frame received: ${JSON.stringify(frame)}`);
        if (!(frame instanceof klf_200_api_1.GW_GET_STATE_CFM) && !(frame instanceof klf_200_api_1.GW_REBOOT_CFM)) {
            // Confirmation messages of the GW_GET_STATE_REQ must be ignored to avoid an infinity loop
            await this.Setup?.stateTimerHandler(this, this.Gateway);
        }
    }
    async onReboot() {
        this.log.info("Automatic reboot due to schedule in configuration");
        this.Setup?.stopStateTimer();
        await this.setStateAsync(`gateway.RebootGateway`, true, false);
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    async onUnload(callback) {
        try {
            // Set shutdown flag
            this.InShutdown = true;
            await this.disposeOnConnectionClosed();
            // Disconnect from the device
            this.log.info(`Disconnecting from the KLF-200...`);
            await this.Connection?.logoutAsync();
            this.log.info("Cleaned everything up...");
            callback();
        }
        catch (e) {
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
            // The state was changed
            this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        }
        else {
            // The state was deleted
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
        // Irgendwo gibt es wohl einen Fehler ohne Message
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
        ((this && this.log) || console).error(`Unhandled promise rejection detected. reason: ${JSON.stringify(reason)}, promise: ${JSON.stringify(promise)}`);
        this.terminate("unhandled promise rejection", 1);
    }
    onUnhandledError(error) {
        ((this && this.log) || console).error(`Unhandled exception occured: ${error}`);
        this.terminate("unhandled exception", 1);
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new Klf200(options);
}
else {
    // otherwise start the instance directly
    (() => new Klf200())();
}
//# sourceMappingURL=main.js.map