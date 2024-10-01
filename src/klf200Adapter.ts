// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import assert from "assert";
import * as fs from "fs/promises";
import {
	Connection,
	DiscoverStatus,
	Disposable,
	Gateway,
	GatewayCommand,
	Group,
	Groups,
	GroupType,
	GW_COMMON_STATUS,
	GW_CS_DISCOVER_NODES_NTF,
	GW_CS_DISCOVER_NODES_REQ,
	GW_CS_REMOVE_NODES_REQ,
	GW_DELETE_GROUP_CFM,
	GW_DELETE_GROUP_REQ,
	GW_DELETE_SCENE_CFM,
	GW_DELETE_SCENE_REQ,
	GW_GET_STATE_CFM,
	GW_INITIALIZE_SCENE_CANCEL_CFM,
	GW_INITIALIZE_SCENE_CANCEL_REQ,
	GW_INITIALIZE_SCENE_CFM,
	GW_INITIALIZE_SCENE_NTF,
	GW_INITIALIZE_SCENE_REQ,
	GW_NEW_GROUP_CFM,
	GW_NEW_GROUP_REQ,
	GW_REBOOT_CFM,
	GW_RECORD_SCENE_CFM,
	GW_RECORD_SCENE_NTF,
	GW_RECORD_SCENE_REQ,
	GW_RENAME_SCENE_CFM,
	GW_RENAME_SCENE_REQ,
	IConnection,
	IGW_FRAME,
	IGW_FRAME_RCV,
	IGW_FRAME_REQ,
	InitializeSceneConfirmationStatus,
	InitializeSceneNotificationStatus,
	LimitationType,
	NodeVariation,
	ParameterActive,
	Product,
	Products,
	RecordSceneStatus,
	RenameSceneStatus,
	Scene,
	Scenes,
	StatusType,
	Velocity,
} from "klf-200-api";
import { Job, scheduleJob } from "node-schedule";
import path from "path";
import { timeout } from "promise-timeout";
import { KLF200DeviceManagement } from "./deviceManagement/klf200DeviceManagement.js";
import { DisposalMap } from "./disposalMap.js";
import { HasConnectionInterface, HasProductsInterface } from "./interfaces.js";
import { Setup } from "./setup.js";
import { SetupGroups } from "./setupGroups.js";
import { SetupProducts } from "./setupProducts.js";
import { SetupScenes } from "./setupScenes.js";
import { Translate } from "./translate.js";
import { ArrayCount, convertErrorToString, waitForSessionFinishedNtfAsync } from "./util/utils.js";

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
			enableAutomaticReboot: boolean;
			automaticRebootCronTime: string;
			advancedSSLConfiguration: boolean;
			SSLPublicKey: string;
			SSLFingerprint: string;
			// Or use a catch-all approach
			// [key: string]: any;
		}
	}
}

type ConnectionWatchDogHandler = (hadError: boolean) => void;

const refreshTimeoutMS = 120_000; // Wait max. 2 minutes for the notification.

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export declare interface Klf200 {
	on(event: string, listener: (...args: any[]) => void): this;
	on(event: "productAdded", listener: (product: Product) => void): this;
	on(event: "productRemoved", listener: (productId: number) => void): this;
	on(event: "sceneAdded", listener: (scene: Scene) => void): this;
	on(event: "sceneRemoved", listener: (sceneId: number) => void): this;
	on(event: "groupAdded", listener: (group: Group) => void): this;
	on(event: "groupRemoved", listener: (groupId: number) => void): this;
	off(event: string, listener: (...args: any[]) => void): this;
	off(event: "productAdded", listener: (product: Product) => void): this;
	off(event: "productRemoved", listener: (productId: number) => void): this;
	off(event: "sceneAdded", listener: (scene: Scene) => void): this;
	off(event: "sceneRemoved", listener: (sceneId: number) => void): this;
	off(event: "groupAdded", listener: (group: Group) => void): this;
	off(event: "groupRemoved", listener: (groupId: number) => void): this;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class Klf200 extends utils.Adapter implements HasConnectionInterface, HasProductsInterface, Translate {
	private disposables: Disposable[] = [];
	private connectionWatchDogHandler: ConnectionWatchDogHandler;
	private InShutdown: boolean;
	private disposalMap = new DisposalMap();
	private deviceManagement: KLF200DeviceManagement | undefined;

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

	private _Setup?: Setup;
	public get Setup(): Setup | undefined {
		return this._Setup;
	}

	private _RebootJob?: Job;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "klf200",
		});

		// Trace unhandled errors
		process.on("unhandledRejection", this.onUnhandledRejection.bind(this));
		process.on("uncaughtException", this.onUnhandledError.bind(this));

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this.on("ready", this.onReady.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("message", this.onMessage.bind(this));
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this.on("unload", this.onUnload.bind(this));

		// Setup connection watchdog handler
		this.InShutdown = false;
		this.connectionWatchDogHandler = (hadError: boolean) => {
			(async () => {
				await this.ConnectionWatchDog(hadError);
			})().catch((reason: any) => {
				this.log.error(`Error occured in connection watch dog handler: ${JSON.stringify(reason)}`);
			});
		};
	}

	private languageFiles?: Partial<Omit<Record<ioBroker.Languages, Record<string, string>>, "en">> & {
		en: Record<string, string>;
	};

	/**
	 * Loads a language file of a given language into memory.
	 *
	 * @param language Language key of the language file that should be loaded into memory.
	 */
	private async loadLanguage(language: ioBroker.Languages): Promise<void> {
		if (!this.languageFiles && language !== "en") {
			// Load english language file first
			await this.loadLanguage("en");
		}

		if (this.languageFiles && language in this.languageFiles) {
			// If language is already loaded, do nothing
			return;
		}

		// Load language file
		const filePath = `${this.adapterDir}/admin/i18n/${language}/translations.json`;
		try {
			await fs.access(filePath, fs.constants.R_OK);
		} catch (error) {
			throw new Error(`Could not load language file ${filePath}.`, {
				cause: error,
			});
		}
		const translations = JSON.parse(await fs.readFile(filePath, { encoding: "utf8", flag: "r" })) as Record<
			string,
			string
		>;

		if (!this.languageFiles) {
			assert(
				language === "en",
				`Language 'en' should be loaded first. Instead, it was tried to load ${language}.`,
			);
			this.languageFiles = { en: translations };
			return;
		}

		this.languageFiles[language] = translations;
	}

	private replaceContext(text: string, context: Record<string, string>): string {
		return text.replace(/\{(\w+)\}/g, (_, key: string) => context[key] || "");
	}

	/**
	 * Returns the translated text of the given textKey in the given language.
	 *
	 * @param language Target language into which the text should be translated.
	 * @param textKey Key of the text in the i18n json files that should be translated.
	 * @param Context Context object that should be used for substitutions in the translation.
	 *
	 * @example
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld": "Hallo Welt!"
	 * // }
	 * // returns 'Hallo Welt!'
	 * await translateTo('de', 'helloworld');
	 *
	 * @example
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld-parameter": "Hallo {who}!"
	 * // }
	 * // returns 'Hallo Welt!'
	 * await translateTo('de', 'helloworld-parameter', { who: 'Welt' });
	 */
	public async translateTo(
		language: ioBroker.Languages,
		textKey: string,
		context?: Record<string, string>,
	): Promise<string> {
		await this.loadLanguage(language);
		assert(this.languageFiles, `At least english language file should be loaded in memory.`);
		assert(this.languageFiles[language], `Language file for language ${language} should be loaded in memory.`);

		// Check if translation exists and throw an error if the language is english.
		// Otherwise, fallback to english.
		if (language === "en" && !(textKey in this.languageFiles.en)) {
			throw new Error(`Could not find translation for ${textKey} in ${language}.`);
		}
		if (!(textKey in this.languageFiles[language])) {
			// Write a warning into the log
			this.log.warn(
				`Could not find translation for ${textKey} in ${language}. Please help translate this adapter into another language and visit https://weblate.iobroker.net/ for more information.`,
			);
			// Fallback to english
			return await this.translateTo("en", textKey, context);
		}

		// Return translation
		const text = this.languageFiles[language][textKey];
		if (context) {
			return this.replaceContext(text, context);
		} else {
			return text;
		}
	}

	/**
	 * Returns the translated text of the given textKey in the system language.
	 *
	 * @param textKey Key of the text in the i18n json files that should be translated.
	 * @param context Context object that should be used for substitutions in the translation.
	 *
	 * @example
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld": "Hallo Welt!"
	 * // }
	 * // returns 'Hallo Welt!'
	 * await translate('helloworld');
	 *
	 * @example
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld-parameter": "Hallo {who}!"
	 * // }
	 * // returns 'Hallo Welt!'
	 * await translate('helloworld-parameter', { who: 'Welt' });
	 */
	public async translate(textKey: string, context?: Record<string, string>): Promise<string> {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return this.translateTo(this.systemConfig?.language || "en", textKey, context);
	}

	private allLanguagesLoaded = false;

	/**
	 * Returns an object containing all translations of the given textKey.
	 *
	 * @param textKey Key of the text in the i18n json files that should be translated.
	 * @param context Context object that should be used for substitutions in the translation.
	 *
	 * @example
	 * // ./admin/i18n/en/translations.json:
	 * // {
	 * //     "helloworld": "Hello World!"
	 * // }
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld": "Hallo Welt!"
	 * // }
	 * // returns {
	 * //     en: 'Hello World!',
	 * //     de: 'Hallo Welt!'
	 * // }
	 * await getTranslatedObject('helloworld');
	 *
	 * @example
	 * // ./admin/i18n/en/translations.json:
	 * // {
	 * //     "helloname-parameter": "Hello, {who}!"
	 * // }
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloname-parameter": "Hallo, {who}!"
	 * // }
	 * // returns {
	 * //     en: 'Hello, Jane Doe!',
	 * //     de: 'Hallo, Jane Doe!'
	 * // }
	 * await getTranslatedObject('helloname-parameter', { who: 'Jane Doe' });
	 */
	public async getTranslatedObject(textKey: string, context?: Record<string, string>): Promise<ioBroker.Translated> {
		const result: ioBroker.Translated = { en: textKey };

		// Read languages only once
		if (!this.allLanguagesLoaded) {
			const readDirResults = await fs.readdir(`${this.adapterDir}/admin/i18n`, {
				withFileTypes: false,
				recursive: false,
				encoding: "utf8",
			});
			for (const readDirResult of readDirResults) {
				await this.loadLanguage(readDirResult as ioBroker.Languages);
			}
			this.allLanguagesLoaded = true;
		}
		assert(this.languageFiles, "languageFiles must be defined");

		// Get the translation for all languages
		for (const language of Object.keys(this.languageFiles)) {
			result[language as ioBroker.Languages] = await this.translateTo(
				language as ioBroker.Languages,
				textKey,
				context,
			);
		}
		return result;
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		try {
			// Initialize your adapter here

			// Reset the connection indicator during startup
			await this.setState("info.connection", false, true);

			// Decrypt password
			if (!this.supportsFeature || !this.supportsFeature("ADAPTER_AUTO_DECRYPT_NATIVE")) {
				this.config.password = this.decrypt(this.config.password);
			}

			// Setup connection and initialize objects and states
			if (!this.config.advancedSSLConfiguration) {
				this._Connection = new Connection(this.config.host);
			} else {
				this._Connection = new Connection(
					this.config.host,
					Buffer.from(this.config.SSLPublicKey),
					this.config.SSLFingerprint,
				);
			}
			try {
				this.log.info(`klf-200-api version: ${await this.getKlfApiVersion()}`);
			} catch (error) {
				this.log.warn(
					`Error occurred when reading the version of the klf-200-api package: ${JSON.stringify(error)}`,
				);
			}
			this.log.info(`Host: ${this.config.host}`);
			try {
				await this.Connection?.loginAsync(this.config.password);
			} catch (error: any) {
				this.log.error(`${error}`);
				this.log.debug(`${(error as Error).stack}`);
				this.terminate(`Login to KLF-200 device at ${this.config.host} failed.`);
				return;
			}
			this.log.info("Connected to interface.");

			// Read data from the gateway and setup states and handlers
			await this.initializeOnConnection();

			// Set up reboot schedule, if enabled
			if (this.config.enableAutomaticReboot === true) {
				this.log.info("Automatic reboot enabled in configuration. Planning reboot job.");
				this._RebootJob = scheduleJob(this.config.automaticRebootCronTime, this.onReboot.bind(this));
			} else {
				this.log.info("Automatic reboot disabled in configuration.");
			}

			// Set the connection indicator to true
			await this.setState("info.connection", true, true);

			this.deviceManagement = new KLF200DeviceManagement(this);
		} catch (e) {
			this.log.error(`Error during initialization of the adapter.`);
			const result = convertErrorToString(e);
			this.log.error(result);
			if (e instanceof Error && e.stack) {
				this.log.debug(e.stack);
			}
			this.terminate ? this.terminate(result) : process.exit(1);
		}
	}

	private async initializeOnConnection(): Promise<void> {
		this.log.info(`Setting up notification handler for gateway state...`);
		this.disposables.push(
			this._Connection!.on(this.onFrameReceived.bind(this)),
			this._Connection!.onFrameSent(this.onFrameSent.bind(this)),
		);

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
		this.log.info(`${ArrayCount(this.Scenes!.Scenes)} scenes found.`);

		this.log.info(`Reading groups...`);
		this._Groups = await Groups.createGroupsAsync(this.Connection!);
		this.log.info(`${ArrayCount(this.Groups!.Groups)} groups found.`);

		this.log.info(`Reading products...`);
		this._Products = await Products.createProductsAsync(this.Connection!);
		this.log.info(`${ArrayCount(this.Products!.Products)} products found.`);

		this.log.info(`Reading product limitations...`);
		const productLimitationError = new Set<string>();
		for (const product of this._Products.Products) {
			if (product) {
				this.log.info(`Reading limitations for product ${product.NodeID}...`);
				for (const limitationType of [LimitationType.MinimumLimitation, LimitationType.MaximumLimitation]) {
					for (const parameterActive of [
						ParameterActive.MP,
						ParameterActive.FP1,
						ParameterActive.FP2,
						ParameterActive.FP3,
						ParameterActive.FP4,
					]) {
						const productLimitationErrorEntry = JSON.stringify([product.NodeID, parameterActive]);
						if (productLimitationError.has(productLimitationErrorEntry)) {
							// Skip additional checks if the parameter was already erronous
							continue;
						}
						try {
							await product.refreshLimitationAsync(limitationType, parameterActive);
						} catch (error) {
							if (
								error instanceof Error &&
								(error.message.startsWith("Unexpected node ID") ||
									error.message.startsWith("Unexpected parameter ID"))
							) {
								productLimitationError.add(productLimitationErrorEntry);
							} else {
								this.log.error((error as Error).toString());
								throw error;
							}
						}
					}
				}

				// After trying to read all limitations, refresh the product to set runStatus und statusReply to a clean state
				const sessionId = await this.Products?.requestStatusAsync(
					product.NodeID,
					StatusType.RequestCurrentPosition,
					[1, 2, 3, 4],
				);
				try {
					assert(this.Connection, "Connection is undefined");
					assert(sessionId, "SessionId is undefined");
					await waitForSessionFinishedNtfAsync(this, this.Connection, sessionId);
				} catch (e) {
					if (e instanceof Error && e.message === "Timeout error") {
						this.log.warn(`Failed to refresh product ${product.NodeID} after timeout. Ignoring error.`);
					} else {
						this.log.debug(`Failed to refresh product ${product.NodeID}.`);
						this.log.error((e as Error).toString());
						throw e;
					}
				}
			}
		}

		// Setup states
		this._Setup = await Setup.setupGlobalAsync(this, this.Gateway!);
		this.disposables.push(this._Setup);
		await SetupScenes.createScenesAsync(this, this.Scenes!, this.disposalMap);
		await SetupGroups.createGroupsAsync(
			this,
			this.Groups?.Groups ?? [],
			this.Products?.Products ?? [],
			this.disposalMap,
		);
		await SetupProducts.createProductsAsync(
			this,
			this.Products?.Products ?? [],
			this.disposalMap,
			productLimitationError,
		);

		this.log.info(`Setting up notification handlers for removal...`);
		// Setup remove notification
		this.disposables.push(
			this.Scenes!.onRemovedScene(this.onRemovedScene.bind(this)),
			this.Products!.onRemovedProduct(this.onRemovedProduct.bind(this)),
			this.Groups!.onRemovedGroup(this.onRemovedGroup.bind(this)),
		);

		this.log.info(`Setting up notification handlers for discovering new objects...`);
		this.disposables.push(
			this.Scenes!.onAddedScene(this.onNewScene.bind(this)),
			this.Products!.onNewProduct(this.onNewProduct.bind(this)),
			this.Groups!.onChangedGroup(this.onNewGroup.bind(this)),
		);

		// Write a finish setup log entry
		this.log.info(`Adapter is ready for use.`);

		// Start state timer
		this.log.info(`Starting background state refresher...`);
		this._Setup?.startStateTimer();

		this.Connection?.KLF200SocketProtocol?.socket.on("close", this.connectionWatchDogHandler);
	}

	private async disposeOnConnectionClosed(): Promise<void> {
		// Remove watchdog handler from socket
		this.log.info(`Remove socket listener...`);
		this.Connection?.KLF200SocketProtocol?.socket.off("close", this.connectionWatchDogHandler);

		// Disconnect all event handlers
		this.log.info(`Shutting down event handlers...`);
		this.disposables.forEach((disposable) => {
			disposable.dispose();
		});
		await this.disposalMap.disposeAll();
	}

	private async ConnectionWatchDog(hadError: boolean): Promise<void> {
		// Stop the state timer first
		this._Setup?.stopStateTimer();

		// Reset the connection indicator
		await this.setState("info.connection", false, true);
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

				await this.initializeOnConnection();

				await this.setState("info.connection", true, true);
			} catch (e) {
				this.log.error(`Login to KLF-200 device at ${this.config.host} failed.`);
				const result = convertErrorToString(e);
				this.log.error(result);
				// Wait a second before retry
				await this.delay(1000);
			}
		}
	}

	private async refreshObjectCount<T>(arr: T[] | undefined, stateId: string): Promise<void> {
		const objectCount = arr ? ArrayCount(arr) : 0;
		await this.setState(stateId, objectCount, true);
	}

	private async refreshScenesCount(): Promise<void> {
		await this.refreshObjectCount(this.Scenes?.Scenes, `scenes.scenesFound`);
	}

	private async refreshProductsCount(): Promise<void> {
		await this.refreshObjectCount(this.Products?.Products, `products.productsFound`);
	}

	private async refreshGroupsCount(): Promise<void> {
		await this.refreshObjectCount(this.Groups?.Groups, `groups.groupsFound`);
	}

	private async onRemovedScene(sceneId: number): Promise<void> {
		const sceneStateId = `scenes.${sceneId}`;
		await this.disposalMap.disposeId(sceneStateId);
		await this.delObjectAsync(sceneStateId, { recursive: true });
		await this.refreshScenesCount();
		this.emit("sceneRemoved", sceneId);
	}

	private async onRemovedProduct(productId: number): Promise<void> {
		const productStateId = `products.${productId}`;
		await this.disposalMap.disposeId(productStateId);
		await this.delObjectAsync(productStateId, { recursive: true });
		await this.refreshProductsCount();
		this.emit("groupRemoved", productId);
	}

	private async onRemovedGroup(groupId: number): Promise<void> {
		const groupStateId = `groups.${groupId}`;
		await this.disposalMap.disposeId(groupStateId);
		await this.delObjectAsync(groupStateId, { recursive: true });
		await this.refreshGroupsCount();
		this.emit("groupRemoved", groupId);
	}

	private async onNewScene(sceneId: number): Promise<void> {
		const newScene = this._Scenes?.Scenes[sceneId];
		if (newScene) {
			await SetupScenes.createSceneAsync(this, newScene, this.disposalMap);
			await this.refreshScenesCount();
			this.emit("sceneAdded", newScene);
		}
	}

	private async onNewProduct(productId: number): Promise<void> {
		const newProduct = this._Products?.Products[productId];
		if (newProduct) {
			const productLimitationError = new Set<string>();
			for (const limitationType of [LimitationType.MinimumLimitation, LimitationType.MaximumLimitation]) {
				for (const parameterActive of [
					ParameterActive.MP,
					ParameterActive.FP1,
					ParameterActive.FP2,
					ParameterActive.FP3,
					ParameterActive.FP4,
				]) {
					try {
						await newProduct.refreshLimitationAsync(limitationType, parameterActive);
					} catch (error) {
						if (
							error instanceof Error &&
							(error.message.startsWith("Unexpected node ID") ||
								error.message.startsWith("Unexpected parameter ID"))
						) {
							productLimitationError.add(JSON.stringify([newProduct.NodeID, parameterActive]));
						} else {
							throw error;
						}
					}
				}
			}
			await SetupProducts.createProductAsync(this, newProduct, this.disposalMap, productLimitationError);
			await this.refreshProductsCount();
			this.emit("productAdded", newProduct);
		}
	}

	private async onNewGroup(groupId: number): Promise<void> {
		const newGroup = this._Groups?.Groups[groupId];
		if (newGroup && this._Products) {
			await SetupGroups.createGroupAsync(this, newGroup, this._Products.Products, this.disposalMap);
			await this.refreshGroupsCount();
			this.emit("groupAdded", newGroup);
		}
	}

	private async onFrameReceived(frame: IGW_FRAME_RCV): Promise<void> {
		this.log.debug(`Frame received (${GatewayCommand[frame.Command]}): ${this.stringifyFrame(frame)}`);
		if (!(frame instanceof GW_GET_STATE_CFM) && !(frame instanceof GW_REBOOT_CFM)) {
			// Confirmation messages of the GW_GET_STATE_REQ must be ignored to avoid an infinity loop
			await this.Setup?.stateTimerHandler(this, this.Gateway!);
		}
	}

	private async onFrameSent(frame: IGW_FRAME_REQ): Promise<void> {
		this.log.debug(`Frame sent (${GatewayCommand[frame.Command]}): ${this.stringifyFrame(frame)}`);
		return Promise.resolve();
	}

	private stringifyFrame(frame: IGW_FRAME): string {
		return JSON.stringify(frame, (key: string, value: any) => {
			if (key.match(/password/i)) {
				return "**********";
			} else {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return value;
			}
		});
	}

	private async onReboot(): Promise<void> {
		this.log.info("Automatic reboot due to schedule in configuration");
		this.Setup?.stopStateTimer();
		await this.setState(`gateway.RebootGateway`, true, false);
	}

	/**
	 * Discover new Products
	 * @returns <c>true</c> if changes occured.
	 */
	public async onDiscover(): Promise<boolean> {
		let onNotificationHandler: Disposable | undefined;
		let resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: any) => void;
		try {
			// Setup notification handler for GW_CS_DISCOVER_NODES_NTF and internal notifications
			const waitForNotificationPromise = timeout(
				new Promise<boolean>((res, rej) => {
					resolve = res;
					reject = rej;
				}),
				refreshTimeoutMS,
			);

			/* Setup a promise for each added or removed node that will fulfill
               when the adapter has finished the setup of the states.
            */
			const addedProductPromiseMap = new Map<
				number,
				{
					promise: Promise<void>;
					resolve: (value: void | PromiseLike<void>) => void;
					reject: (reason?: any) => void;
				}
			>();
			const removedProductPromiseMap = new Map<
				number,
				{
					promise: Promise<void>;
					resolve: (value: void | PromiseLike<void>) => void;
					reject: (reason?: any) => void;
				}
			>();

			const onNewProductHandler = function (product: Product): void {
				const productId = product.NodeID;
				if (!addedProductPromiseMap.has(productId)) {
					let resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void;
					const newProductHandlerPromise = new Promise<void>((res, rej) => {
						resolve = res;
						reject = rej;
					});
					addedProductPromiseMap.set(productId, {
						promise: newProductHandlerPromise,
						resolve: resolve!,
						reject: reject!,
					});
				}
				addedProductPromiseMap.get(productId)?.resolve();
			}.bind(this);

			const onRemovedProductHandler = function (productId: number): void {
				if (!removedProductPromiseMap.has(productId)) {
					let resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void;
					const newProductHandlerPromise = new Promise<void>((res, rej) => {
						resolve = res;
						reject = rej;
					});
					removedProductPromiseMap.set(productId, {
						promise: newProductHandlerPromise,
						resolve: resolve!,
						reject: reject!,
					});
				}
				removedProductPromiseMap.get(productId)?.resolve();
			}.bind(this);

			this.on("productAdded", onNewProductHandler);
			this.on("productRemoved", onRemovedProductHandler);

			try {
				onNotificationHandler = this.Connection?.on(
					(frame) => {
						const notificationFrame = frame as GW_CS_DISCOVER_NODES_NTF;
						try {
							switch (notificationFrame.DiscoverStatus) {
								case DiscoverStatus.OK:
								case DiscoverStatus.PartialOK:
									if (
										notificationFrame.AddedNodes.length > 0 ||
										notificationFrame.RemovedNodes.length > 0
									) {
										// Add promises to wait for for each added or removed node
										for (const productId of notificationFrame.AddedNodes) {
											if (!addedProductPromiseMap.has(productId)) {
												let resolve: (value: void | PromiseLike<void>) => void,
													reject: (reason?: any) => void;
												const newProductHandlerPromise = new Promise<void>((res, rej) => {
													resolve = res;
													reject = rej;
												});
												addedProductPromiseMap.set(productId, {
													promise: newProductHandlerPromise,
													resolve: resolve!,
													reject: reject!,
												});
											}
										}
										for (const productId of notificationFrame.RemovedNodes) {
											if (!removedProductPromiseMap.has(productId)) {
												let resolve: (value: void | PromiseLike<void>) => void,
													reject: (reason?: any) => void;
												const newProductHandlerPromise = new Promise<void>((res, rej) => {
													resolve = res;
													reject = rej;
												});
												removedProductPromiseMap.set(productId, {
													promise: newProductHandlerPromise,
													resolve: resolve!,
													reject: reject!,
												});
											}
										}
										resolve(true);
									} else {
										resolve(false);
									}
									break;

								case DiscoverStatus.Busy:
									reject(new Error(`KLF-200 is busy.`));
									break;

								case DiscoverStatus.Failed:
									reject(new Error(`KLF-200 is not ready.`));
									break;

								default:
									reject(
										new Error(
											`Unknown discovery status code ${notificationFrame.DiscoverStatus as number}.`,
										),
									);
									break;
							}
						} finally {
							onNotificationHandler?.dispose();
							onNotificationHandler = undefined;
						}
					},
					[GatewayCommand.GW_CS_DISCOVER_NODES_NTF],
				);

				// Start discovery
				await this.Connection?.sendFrameAsync(new GW_CS_DISCOVER_NODES_REQ());

				// Get the result
				const result = await waitForNotificationPromise;

				// Wait for the adapter to setup new products or remove deleted products
				await Promise.all(
					[...addedProductPromiseMap.values(), ...removedProductPromiseMap.values()].map((pm) => pm.promise),
				);

				return result;
			} finally {
				this.off("productAdded", onNewProductHandler);
				this.off("productRemoved", onRemovedProductHandler);
			}
		} finally {
			onNotificationHandler?.dispose();
		}
	}

	public async onRemoveProduct(productId: number): Promise<void> {
		let resolve: (value: void | PromiseLike<void>) => void;
		const removedProductHandlerPromise = new Promise<void>((res) => {
			resolve = res;
		});
		const onRemovedProductHandler = function (productIdInner: number): void {
			if (productIdInner === productId) {
				resolve();
			}
		};
		this.on("productRemoved", onRemovedProductHandler);
		try {
			await this.Connection?.sendFrameAsync(new GW_CS_REMOVE_NODES_REQ([productId]));
			// Wait for product being removed from adapter
			await removedProductHandlerPromise;
		} finally {
			this.off("productRemoved", onRemovedProductHandler);
		}
	}

	public async onWinkProduct(productId: number): Promise<void> {
		const winkStateId = `products.${productId}.wink`;
		await this.setState(winkStateId, true);
	}

	public async onRenameProduct(productId: number, newName: string): Promise<void> {
		const product = this.Products?.Products[productId];

		if (!product) {
			throw new Error(`Product with ID ${productId} not found in adapter.`);
		}

		await product?.setNameAsync(newName);
	}

	public async onAddGroup(
		groupName: string,
		products: number[],
		order?: number,
		placement?: number,
		velocity?: Velocity,
		nodeVariation?: NodeVariation,
	): Promise<number> {
		let resolve: (value: void | PromiseLike<void>) => void;
		const addGroupHandlerPromise = new Promise<void>((res) => {
			resolve = res;
		});
		const onAddedGroupHandler = function (group: Group): void {
			if (group.Name === groupName) {
				resolve();
			}
		};
		this.on("groupAdded", onAddedGroupHandler);
		try {
			const newGroupCfm = <GW_NEW_GROUP_CFM>(
				await this.Connection?.sendFrameAsync(
					new GW_NEW_GROUP_REQ(
						groupName,
						GroupType.UserGroup,
						products,
						order,
						placement,
						velocity,
						nodeVariation,
					),
				)
			);
			switch (newGroupCfm.Status) {
				case GW_COMMON_STATUS.INVALID_NODE_ID:
					throw new Error(`Invalid parameter.`);

				case GW_COMMON_STATUS.ERROR:
					throw new Error(`Request failed.`);

				case GW_COMMON_STATUS.SUCCESS:
					// Wait for group being added by adapter
					await addGroupHandlerPromise;
					return newGroupCfm.GroupID;

				default:
					throw new Error(`Unknown status code: ${newGroupCfm.Status as number}.`);
			}
		} finally {
			this.off("groupAdded", onAddedGroupHandler);
		}
	}

	public async onChangeGroup(
		groupId: number,
		groupName: string,
		products: number[],
		order?: number,
		placement?: number,
		velocity?: Velocity,
		nodeVariation?: NodeVariation,
	): Promise<void> {
		const group = this.Groups?.Groups[groupId];
		assert(group, `Group with ID ${groupId} not found.`);
		await group.changeGroupAsync(
			order !== undefined ? order : group.Order,
			placement !== undefined ? placement : group.Placement,
			groupName !== undefined ? groupName : group.Name,
			velocity !== undefined ? velocity : group.Velocity,
			nodeVariation !== undefined ? nodeVariation : group.NodeVariation,
			products,
		);
	}

	public async onRemoveGroup(groupId: number): Promise<void> {
		let resolve: (value: void | PromiseLike<void>) => void;
		const removedGroupHandlerPromise = new Promise<void>((res) => {
			resolve = res;
		});
		const onRemovedGroupHandler = function (groupIdInner: number): void {
			if (groupIdInner === groupId) {
				resolve();
			}
		};
		this.on("groupRemoved", onRemovedGroupHandler);
		try {
			const deleteGroupCfm = <GW_DELETE_GROUP_CFM>(
				await this.Connection?.sendFrameAsync(new GW_DELETE_GROUP_REQ(groupId))
			);
			switch (deleteGroupCfm.Status) {
				case GW_COMMON_STATUS.INVALID_NODE_ID:
					throw new Error(`Invalid group index.`);

				case GW_COMMON_STATUS.ERROR:
					throw new Error(`Request failed.`);

				case GW_COMMON_STATUS.SUCCESS:
					// Wait for product being removed from adapter
					await removedGroupHandlerPromise;
					break;

				default:
					throw new Error(`Unknown status code: ${deleteGroupCfm.Status as number}.`);
			}
		} finally {
			this.off("groupRemoved", onRemovedGroupHandler);
		}
	}

	public async onRemoveScene(sceneId: number): Promise<void> {
		let resolve: (value: void | PromiseLike<void>) => void;
		const removedSceneHandlerPromise = new Promise<void>((res) => {
			resolve = res;
		});
		const onRemovedSceneHandler = function (sceneIdInner: number): void {
			if (sceneIdInner === sceneId) {
				resolve();
			}
		};
		this.on("sceneRemoved", onRemovedSceneHandler);
		try {
			const deleteSceneCfm = <GW_DELETE_SCENE_CFM>(
				await this.Connection?.sendFrameAsync(new GW_DELETE_SCENE_REQ(sceneId))
			);
			switch (deleteSceneCfm.Status) {
				case GW_COMMON_STATUS.ERROR:
					throw new Error(`Invalid scene ID.`);

				case GW_COMMON_STATUS.SUCCESS:
					// Wait for product being removed from adapter
					await removedSceneHandlerPromise;
					break;

				default:
					throw new Error(`Unknown status code: ${deleteSceneCfm.Status as number}.`);
			}
			// Wait for product being removed from adapter
			await removedSceneHandlerPromise;
		} finally {
			this.off("sceneRemoved", onRemovedSceneHandler);
		}
	}

	public async onRenameScene(sceneId: number, newName: string): Promise<void> {
		const scene = this.Scenes?.Scenes[sceneId];

		if (!scene) {
			throw new Error(`Scene with ID ${sceneId} not found in adapter.`);
		}

		const renameSceneCfm = <GW_RENAME_SCENE_CFM>(
			await this.Connection?.sendFrameAsync(new GW_RENAME_SCENE_REQ(sceneId, newName))
		);
		switch (renameSceneCfm.Status) {
			case RenameSceneStatus.OK:
				return;

			case RenameSceneStatus.InvalidSceneIndex:
				throw new Error("Invalid scene index.");

			case RenameSceneStatus.NameInUse:
				throw new Error("Name already in use.");

			default:
				throw new Error(`Unknown status code: ${renameSceneCfm.Status as number}.`);
		}
	}

	public async onNewSceneInitialize(): Promise<number[]> {
		let disposable: Disposable | undefined;
		try {
			const sceneInitializationNotificationPromise = new Promise<number[]>((resolve, reject) => {
				disposable = this.Connection?.on(
					(frame) => {
						try {
							const notificationFrame = frame as GW_INITIALIZE_SCENE_NTF;
							switch (notificationFrame.Status) {
								case InitializeSceneNotificationStatus.OK:
								case InitializeSceneNotificationStatus.PartlyOK:
									resolve(notificationFrame.FailedNodes);
									break;

								case InitializeSceneNotificationStatus.Error:
									reject(new Error("No nodes initialized."));
									break;

								default:
									reject(new Error(`Unknown status code: ${notificationFrame.Status as number}.`));
									break;
							}
						} finally {
							disposable?.dispose();
							disposable = undefined;
						}
					},
					[GatewayCommand.GW_INITIALIZE_SCENE_NTF],
				);
			});
			const sceneInitializationCfm = <GW_INITIALIZE_SCENE_CFM>(
				await this.Connection?.sendFrameAsync(new GW_INITIALIZE_SCENE_REQ())
			);
			switch (sceneInitializationCfm.Status) {
				case InitializeSceneConfirmationStatus.OK:
					break;

				case InitializeSceneConfirmationStatus.EmptySystemTable:
					throw new Error("System table is empty. Please add at least one product before defining a scene.");

				case InitializeSceneConfirmationStatus.OutOfStorage:
					throw new Error("Can't store more scenes.");

				default:
					throw new Error(`Unknown status code: ${sceneInitializationCfm.Status as number}.`);
			}
			return await timeout(sceneInitializationNotificationPromise, 120_000);
		} finally {
			disposable?.dispose();
			disposable = undefined;
		}
	}

	public async onNewSceneCancel(): Promise<void> {
		const cancelSceneInitializationCfm = <GW_INITIALIZE_SCENE_CANCEL_CFM>(
			await this.Connection?.sendFrameAsync(new GW_INITIALIZE_SCENE_CANCEL_REQ())
		);
		switch (cancelSceneInitializationCfm.Status) {
			case GW_COMMON_STATUS.SUCCESS:
				return;

			case GW_COMMON_STATUS.ERROR:
				throw new Error("Not in scene recoding status.");

			default:
				throw new Error(`Unknown status code: ${cancelSceneInitializationCfm.Status as number}.`);
		}
	}

	public async onNewSceneSave(sceneName: string): Promise<number> {
		let disposable: Disposable | undefined;
		try {
			const sceneNotificationReceivedPromise = new Promise<number>((resolve, reject) => {
				disposable = this.Connection?.on(
					(frame) => {
						try {
							switch ((frame as GW_RECORD_SCENE_NTF).Status) {
								case RecordSceneStatus.OK:
									resolve((frame as GW_RECORD_SCENE_NTF).SceneID);
									break;

								case RecordSceneStatus.RequestFailed:
									reject(new Error("Request failed.", { cause: frame }));
									break;

								case RecordSceneStatus.NoProductStimulation:
									reject(new Error("No product stimulation.", { cause: frame }));
									break;

								case RecordSceneStatus.OutOfStorage:
									reject(new Error("Out of storage.", { cause: frame }));
									break;

								default:
									reject(
										new Error(
											`Unknown status code: ${(frame as GW_RECORD_SCENE_NTF).Status as number}.`,
											{
												cause: frame,
											},
										),
									);
									break;
							}
						} finally {
							disposable?.dispose();
							disposable = undefined;
						}
					},
					[GatewayCommand.GW_RECORD_SCENE_NTF],
				);
			});
			const newSceneAddedPromise = new Promise<void>((resolve, reject) => {
				const onNewSceneHandler = (() => {
					try {
						this.off("sceneAdded", onNewSceneHandler);
						resolve();
					} catch (error) {
						reject(error);
					}
				}).bind(this);
				this.on("sceneAdded", onNewSceneHandler);
			});
			const recordSceneCfm = <GW_RECORD_SCENE_CFM>(
				await this.Connection?.sendFrameAsync(new GW_RECORD_SCENE_REQ(sceneName))
			);
			switch (recordSceneCfm.Status) {
				case GW_COMMON_STATUS.SUCCESS:
					break;

				case GW_COMMON_STATUS.ERROR:
					throw new Error("Not in scene recoding status.");

				default:
					throw new Error(`Unknown status code: ${recordSceneCfm.Status as number}.`);
			}
			const sceneId = await timeout(sceneNotificationReceivedPromise, 120_000);
			await this.Scenes?.refreshScenesAsync();
			await newSceneAddedPromise;
			return sceneId;
		} finally {
			disposable?.dispose();
			disposable = undefined;
		}
	}

	/**
	 * Retrieves the version of the klf-200-api module.
	 *
	 * @return {string} The version of the klf-200-api module.
	 */
	private async getKlfApiVersion(): Promise<string> {
		let klf200ModulePath = require.resolve("klf-200-api");
		this.log.debug(`klf-200-api found in path ${klf200ModulePath}`);

		while (path.basename(klf200ModulePath) !== "klf-200-api") {
			// Go up one step until we have found the root of the module:
			klf200ModulePath = path.dirname(klf200ModulePath);
		}

		const klf200PackageJsonPath = path.join(klf200ModulePath, "package.json");

		const moduleInfo = JSON.parse(await fs.readFile(klf200PackageJsonPath, "utf8")) as { version: string };

		return moduleInfo.version;
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private async onUnload(callback: () => void): Promise<void> {
		try {
			// Set shutdown flag
			this.InShutdown = true;

			// Reset the connection indicator during shutdown
			await this.setState("info.connection", false, true);

			await this.disposeOnConnectionClosed();

			// Disconnect from the device
			this.log.info(`Disconnecting from the KLF-200...`);
			await this.Connection?.logoutAsync();

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
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state) {
			// The state was changed
			this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.debug(`state ${id} deleted`);
		}
	}

	/**
	 * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	 * Using this method requires "common.message" property to be set to true in io-package.json
	 */
	private onMessage(obj: ioBroker.Message): void {
		this.log.debug(`Message received: ${JSON.stringify(obj)}`);
		// if (typeof obj === "object" && obj.message) {
		// 	if (obj.command === "send") {
		// 		// e.g. send email or pushover or whatever
		// 		this.log.info("send command");

		// 		// Send response in callback if required
		// 		if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
		// 	}
		// }
	}

	getErrorMessage(err: Error | string): string {
		// Irgendwo gibt es wohl einen Fehler ohne Message
		if (err == null) return "undefined";
		if (typeof err === "string") return err;
		if (err.message != null) return err.message;
		if (err.name != null) return err.name;
		return err.toString();
	}

	onUnhandledRejection(reason: object | null | undefined, promise: Promise<any>): void {
		((this && this.log) || console).error(
			`Unhandled promise rejection detected. reason: ${JSON.stringify(reason)}, promise: ${JSON.stringify(
				promise,
			)}`,
		);
		this.terminate("unhandled promise rejection", 1);
	}

	onUnhandledError(error: Error): void {
		((this && this.log) || console).error(`Unhandled exception occured: ${JSON.stringify(error)}`);
		this.terminate("unhandled exception", 1);
	}
}
