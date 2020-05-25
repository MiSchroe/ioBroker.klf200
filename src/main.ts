/*
 * Created with @iobroker/create-adapter v1.16.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import { Connection, Gateway, Groups, IConnection, Products, Scenes } from "klf-200-api";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";
import { Setup } from "./setup";
import { SetupGroups } from "./setupGroups";
import { SetupProducts } from "./setupProducts";
import { SetupScenes } from "./setupScenes";

// Load your modules here, e.g.:
// import * as fs from "fs";

// Augment the adapter.config object with the actual types
// TODO: delete this in the next version
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace ioBroker {
		interface AdapterConfig {
			// Define the shape of your options here (recommended)
			host: string;
			password: string;
			// Or use a catch-all approach
			// [key: string]: any;
		}
	}
}

class Klf200 extends utils.Adapter {
	private disposables: Disposable[] = [];

	private _Connection?: IConnection;
	public get Connection(): IConnection | undefined {
		return this._Connection;
	}

	private _Gateway?: Gateway;
	public get Gateway(): Gateway | undefined {
		return this._Gateway;
	}

	private _Groups?: Groups;
	public get Groups(): Groups | undefined {
		return this._Groups;
	}

	private _Scenes?: Scenes;
	public get Scenes(): Scenes | undefined {
		return this._Scenes;
	}

	private _Products?: Products;
	public get Products(): Products | undefined {
		return this._Products;
	}

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "klf200",
		});
		this.on("ready", this.onReady.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		try {
			// Initialize your adapter here

			// Reset the connection indicator during startup
			await this.setStateAsync("info.connection", false, true);

			// Setup connection and initialize objects and states
			this._Connection = new Connection(this.config.host); // TODO: Add configs for CA and fingerprint
			this.log.info(`Host: ${this.config.host}`);
			try {
				await this.Connection?.loginAsync(this.config.password);
			} catch (error) {
				this.terminate(`Login to KLF-200 device at ${this.config.host} failed.`);
				return;
			}

			// Set the connection indicator to true and register a callback for connection lost
			await this.setStateAsync("info.connection", true, true);
			this.log.info("Connected to interface.");

			this.Connection?.KLF200SocketProtocol?.socket.on("close", async (hadError: boolean) => {
				// Reset the connection indicator
				await this.setStateAsync("info.connection", false, true);
				if (hadError === true) {
					this.log.error("The underlying connection has been closed due to some error.");
				}
			});

			// Read device info, scenes, groups and products and setup device
			this.log.info(`Reading device information...`);
			this._Gateway = new Gateway(this.Connection!);

			this.log.info(`Enabling the house status monitor...`);
			await this.Gateway?.enableHouseStatusMonitorAsync();

			this.log.info(`Setting UTC clock to the current time.`);
			await this.Gateway?.setUTCDateTimeAsync();

			this.log.info(`Setting time zone to :GMT+1:GMT+2:0060:(1994)040102-0:110102-0`);
			await this.Gateway?.setTimeZoneAsync(":GMT+1:GMT+2:0060:(1994)040102-0:110102-0");

			this.log.info(`Reading scenes...`);
			this._Scenes = await Scenes.createScenesAsync(this.Connection!);
			this.log.info(`${this.Scenes?.Scenes.length} scenes found.`);

			this.log.info(`Reading groups...`);
			this._Groups = await Groups.createGroupsAsync(this.Connection!);
			this.log.info(`${this.Groups?.Groups.length} groups found.`);

			this.log.info(`Reading products...`);
			this._Products = await Products.createProductsAsync(this.Connection!);
			this.log.info(`${this.Products?.Products.length} products found.`);

			// Setup states
			await Setup.setupGlobalAsync(this);
			this.disposables.push(...(await SetupScenes.createScenesAsync(this, this.Scenes?.Scenes ?? [])));
			this.disposables.push(
				...(await SetupGroups.createGroupsAsync(
					this,
					this.Groups?.Groups ?? [],
					this.Products?.Products ?? [],
				)),
			);
			this.disposables.push(...(await SetupProducts.createProductsAsync(this, this.Products?.Products ?? [])));

			// Write a finish setup log entry
			this.log.info(`Adapter is ready for use.`);
		} catch (e) {
			this.log.error(`Error during initialization of the adapter.`);
			this.log.error(e);
			this.terminate(e);
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private async onUnload(callback: () => void): Promise<void> {
		try {
			// Disconnect all event handlers
			this.log.info(`Shutting down event handlers...`);
			this.disposables.forEach((disposable) => {
				disposable.dispose();
			});

			// Disconnect from the device
			this.log.info(`Disconnecting from the KLF-200...`);
			await this.Connection?.logoutAsync();

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
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state) {
			// The state was changed
			this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
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
}

if (module.parent) {
	// Export the constructor in compact mode
	module.exports = (options?: Partial<utils.AdapterOptions>) => new Klf200(options);
} else {
	// otherwise start the instance directly
	(() => new Klf200())();
}
