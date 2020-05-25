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
class Klf200 extends utils.Adapter {
    constructor(options = {}) {
        super(Object.assign(Object.assign({}, options), { name: "klf200" }));
        this.disposables = [];
        this.on("ready", this.onReady.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        // this.on("stateChange", this.onStateChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
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
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
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
            (_c = (_b = this.Connection) === null || _b === void 0 ? void 0 : _b.KLF200SocketProtocol) === null || _c === void 0 ? void 0 : _c.socket.on("close", async (hadError) => {
                // Reset the connection indicator
                await this.setStateAsync("info.connection", false, true);
                if (hadError === true) {
                    this.log.error("The underlying connection has been closed due to some error.");
                }
            });
            // Read device info, scenes, groups and products and setup device
            this.log.info(`Reading device information...`);
            this._Gateway = new klf_200_api_1.Gateway(this.Connection);
            this.log.info(`Enabling the house status monitor...`);
            await ((_d = this.Gateway) === null || _d === void 0 ? void 0 : _d.enableHouseStatusMonitorAsync());
            this.log.info(`Setting UTC clock to the current time.`);
            await ((_e = this.Gateway) === null || _e === void 0 ? void 0 : _e.setUTCDateTimeAsync());
            this.log.info(`Setting time zone to :GMT+1:GMT+2:0060:(1994)040102-0:110102-0`);
            await ((_f = this.Gateway) === null || _f === void 0 ? void 0 : _f.setTimeZoneAsync(":GMT+1:GMT+2:0060:(1994)040102-0:110102-0"));
            this.log.info(`Reading scenes...`);
            this._Scenes = await klf_200_api_1.Scenes.createScenesAsync(this.Connection);
            this.log.info(`${(_g = this.Scenes) === null || _g === void 0 ? void 0 : _g.Scenes.length} scenes found.`);
            this.log.info(`Reading groups...`);
            this._Groups = await klf_200_api_1.Groups.createGroupsAsync(this.Connection);
            this.log.info(`${(_h = this.Groups) === null || _h === void 0 ? void 0 : _h.Groups.length} groups found.`);
            this.log.info(`Reading products...`);
            this._Products = await klf_200_api_1.Products.createProductsAsync(this.Connection);
            this.log.info(`${(_j = this.Products) === null || _j === void 0 ? void 0 : _j.Products.length} products found.`);
            // Setup states
            await setup_1.Setup.setupGlobalAsync(this);
            this.disposables.push(...(await setupScenes_1.SetupScenes.createScenesAsync(this, (_l = (_k = this.Scenes) === null || _k === void 0 ? void 0 : _k.Scenes) !== null && _l !== void 0 ? _l : [])));
            this.disposables.push(...(await setupGroups_1.SetupGroups.createGroupsAsync(this, (_o = (_m = this.Groups) === null || _m === void 0 ? void 0 : _m.Groups) !== null && _o !== void 0 ? _o : [], (_q = (_p = this.Products) === null || _p === void 0 ? void 0 : _p.Products) !== null && _q !== void 0 ? _q : [])));
            this.disposables.push(...(await setupProducts_1.SetupProducts.createProductsAsync(this, (_s = (_r = this.Products) === null || _r === void 0 ? void 0 : _r.Products) !== null && _s !== void 0 ? _s : [])));
            // Write a finish setup log entry
            this.log.info(`Adapter is ready for use.`);
        }
        catch (e) {
            this.log.error(`Error during initialization of the adapter.`);
            this.log.error(e);
            this.terminate(e);
        }
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    async onUnload(callback) {
        var _a;
        try {
            // Disconnect all event handlers
            this.log.info(`Shutting down event handlers...`);
            this.disposables.forEach((disposable) => {
                disposable.dispose();
            });
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
}
if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options) => new Klf200(options);
}
else {
    // otherwise start the instance directly
    (() => new Klf200())();
}
