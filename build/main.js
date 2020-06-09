"use strict";
/*
 * Created with @iobroker/create-adapter v1.16.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const klf_200_api_1 = require("klf-200-api");
const setup_1 = require("./setup");
const setupGroups_1 = require("./setupGroups");
const setupProducts_1 = require("./setupProducts");
const setupScenes_1 = require("./setupScenes");
const utils_1 = require("./util/utils");
class Klf200 extends utils.Adapter {
    constructor(options = {}) {
        super(Object.assign(Object.assign({}, options), { name: "klf200" }));
        this.disposables = [];
        this.on("ready", this.onReady.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
        // Setup connection watchdog handler
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
            // Initialize your adapter here
            // Reset the connection indicator during startup
            await this.setStateAsync("info.connection", false, true);
            // Setup connection and initialize objects and states
            this._Connection = new klf_200_api_1.Connection(this.config.host); // TODO: Add configs for CA and fingerprint
            this.log.info(`Host: ${this.config.host}`);
            try {
                await ((_a = this.Connection) === null || _a === void 0 ? void 0 : _a.loginAsync(this.config.password));
            }
            catch (error) {
                this.terminate(`Login to KLF-200 device at ${this.config.host} failed.`);
                return;
            }
            // Set the connection indicator to true and register a callback for connection lost
            await this.setStateAsync("info.connection", true, true);
            this.log.info("Connected to interface.");
            // Read data from the gateway and setup states and handlers
            await this.initializeOnConnection();
        }
        catch (e) {
            this.log.error(`Error during initialization of the adapter.`);
            this.log.error(e);
            this.terminate ? this.terminate(e) : process.exit(1);
        }
    }
    async initializeOnConnection() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
        // Read device info, scenes, groups and products and setup device
        this.log.info(`Reading device information...`);
        this._Gateway = new klf_200_api_1.Gateway(this.Connection);
        this.log.info(`Enabling the house status monitor...`);
        await ((_a = this.Gateway) === null || _a === void 0 ? void 0 : _a.enableHouseStatusMonitorAsync());
        this.log.info(`Setting UTC clock to the current time.`);
        await ((_b = this.Gateway) === null || _b === void 0 ? void 0 : _b.setUTCDateTimeAsync());
        this.log.info(`Setting time zone to :GMT+1:GMT+2:0060:(1994)040102-0:110102-0`);
        await ((_c = this.Gateway) === null || _c === void 0 ? void 0 : _c.setTimeZoneAsync(":GMT+1:GMT+2:0060:(1994)040102-0:110102-0"));
        this.log.info(`Reading scenes...`);
        this._Scenes = await klf_200_api_1.Scenes.createScenesAsync(this.Connection);
        this.log.info(`${utils_1.ArrayCount(this.Scenes.Scenes)} scenes found.`);
        this.log.info(`Reading groups...`);
        this._Groups = await klf_200_api_1.Groups.createGroupsAsync(this.Connection);
        this.log.info(`${utils_1.ArrayCount(this.Groups.Groups)} groups found.`);
        this.log.info(`Reading products...`);
        this._Products = await klf_200_api_1.Products.createProductsAsync(this.Connection);
        this.log.info(`${utils_1.ArrayCount(this.Products.Products)} products found.`);
        // Setup states
        this._Setup = await setup_1.Setup.setupGlobalAsync(this, this.Gateway);
        this.disposables.push(this._Setup);
        this.disposables.push(...(await setupScenes_1.SetupScenes.createScenesAsync(this, (_e = (_d = this.Scenes) === null || _d === void 0 ? void 0 : _d.Scenes) !== null && _e !== void 0 ? _e : [])));
        this.disposables.push(...(await setupGroups_1.SetupGroups.createGroupsAsync(this, (_g = (_f = this.Groups) === null || _f === void 0 ? void 0 : _f.Groups) !== null && _g !== void 0 ? _g : [], (_j = (_h = this.Products) === null || _h === void 0 ? void 0 : _h.Products) !== null && _j !== void 0 ? _j : [])));
        this.disposables.push(...(await setupProducts_1.SetupProducts.createProductsAsync(this, (_l = (_k = this.Products) === null || _k === void 0 ? void 0 : _k.Products) !== null && _l !== void 0 ? _l : [])));
        this.log.info(`Setting up notification handlers for removal...`);
        // Setup remove notification
        this.disposables.push((_m = this._Scenes) === null || _m === void 0 ? void 0 : _m.onRemovedScene(this.onRemovedScene.bind(this)), (_o = this._Products) === null || _o === void 0 ? void 0 : _o.onRemovedProduct(this.onRemovedProduct.bind(this)), (_p = this._Groups) === null || _p === void 0 ? void 0 : _p.onRemovedGroup(this.onRemovedGroup.bind(this)));
        this.log.info(`Setting up notification handlers for discovering new objects...`);
        this.disposables.push((_q = this._Products) === null || _q === void 0 ? void 0 : _q.onNewProduct(this.onNewProduct.bind(this)), (_r = this._Groups) === null || _r === void 0 ? void 0 : _r.onChangedGroup(this.onNewGroup.bind(this)));
        // Write a finish setup log entry
        this.log.info(`Adapter is ready for use.`);
        // Start state timer
        this.log.info(`Starting background state refresher...`);
        (_s = this._Setup) === null || _s === void 0 ? void 0 : _s.startStateTimer();
        (_u = (_t = this.Connection) === null || _t === void 0 ? void 0 : _t.KLF200SocketProtocol) === null || _u === void 0 ? void 0 : _u.socket.on("close", this.connectionWatchDogHandler);
    }
    async disposeOnConnectionClosed() {
        var _a, _b;
        // Remove watchdog handler from socket
        this.log.info(`Remove socket listener...`);
        (_b = (_a = this.Connection) === null || _a === void 0 ? void 0 : _a.KLF200SocketProtocol) === null || _b === void 0 ? void 0 : _b.socket.off("close", this.connectionWatchDogHandler);
        // Disconnect all event handlers
        this.log.info(`Shutting down event handlers...`);
        this.disposables.forEach((disposable) => {
            disposable.dispose();
        });
    }
    async ConnectionWatchDog(hadError) {
        var _a, _b;
        // Stop the state timer first
        (_a = this._Setup) === null || _a === void 0 ? void 0 : _a.stopStateTimer();
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
                await ((_b = this.Connection) === null || _b === void 0 ? void 0 : _b.loginAsync(this.config.password));
                isConnected = true;
                this.log.info("Reconnected.");
                await this.setStateAsync("info.connection", true, true);
                await this.initializeOnConnection();
            }
            catch (e) {
                this.log.error(`Login to KLF-200 device at ${this.config.host} failed.`);
                this.log.error(e);
                // Wait a second before retry
                await new Promise((resolve) => setTimeout(resolve, 1000));
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
        var _a;
        const newProduct = (_a = this._Products) === null || _a === void 0 ? void 0 : _a.Products[productId];
        if (newProduct) {
            return await setupProducts_1.SetupProducts.createProductAsync(this, newProduct);
        }
        else {
            return [];
        }
    }
    async onNewGroup(groupId) {
        var _a, _b;
        const newGroup = (_a = this._Groups) === null || _a === void 0 ? void 0 : _a.Groups[groupId];
        if (newGroup) {
            return await setupGroups_1.SetupGroups.createGroupAsync(this, newGroup, (_b = this._Products) === null || _b === void 0 ? void 0 : _b.Products);
        }
        else {
            return [];
        }
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    async onUnload(callback) {
        var _a;
        try {
            // Set shutdown flag
            this.InShutdown = true;
            await this.disposeOnConnectionClosed();
            // Disconnect from the device
            this.log.info(`Disconnecting from the KLF-200...`);
            await ((_a = this.Connection) === null || _a === void 0 ? void 0 : _a.logoutAsync());
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
}
if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options) => new Klf200(options);
}
else {
    // otherwise start the instance directly
    (() => new Klf200())();
}
//# sourceMappingURL=main.js.map