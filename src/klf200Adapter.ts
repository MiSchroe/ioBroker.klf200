// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import assert from "assert";
import * as fs from "fs/promises";
import {
	CommandStatus,
	Connection,
	DiscoverStatus,
	type Disposable,
	Gateway,
	GatewayCommand,
	type Group,
	Groups,
	GroupType,
	type GW_ACTIVATE_PRODUCTGROUP_CFM,
	type GW_ACTIVATE_PRODUCTGROUP_REQ,
	type GW_ACTIVATE_SCENE_CFM,
	type GW_ACTIVATE_SCENE_REQ,
	type GW_CLEAR_ACTIVATION_LOG_CFM,
	type GW_CLEAR_ACTIVATION_LOG_REQ,
	type GW_COMMAND_SEND_CFM,
	type GW_COMMAND_SEND_REQ,
	GW_COMMON_STATUS,
	type GW_CS_ACTIVATE_CONFIGURATION_MODE_CFM,
	type GW_CS_ACTIVATE_CONFIGURATION_MODE_REQ,
	type GW_CS_CONTROLLER_COPY_CFM,
	type GW_CS_CONTROLLER_COPY_REQ,
	type GW_CS_DISCOVER_NODES_CFM,
	type GW_CS_DISCOVER_NODES_NTF,
	GW_CS_DISCOVER_NODES_REQ,
	type GW_CS_GENERATE_NEW_KEY_CFM,
	type GW_CS_GENERATE_NEW_KEY_REQ,
	type GW_CS_GET_SYSTEMTABLE_DATA_CFM,
	type GW_CS_GET_SYSTEMTABLE_DATA_REQ,
	type GW_CS_RECEIVE_KEY_CFM,
	type GW_CS_RECEIVE_KEY_REQ,
	type GW_CS_REMOVE_NODES_CFM,
	GW_CS_REMOVE_NODES_REQ,
	type GW_CS_REPAIR_KEY_CFM,
	type GW_CS_REPAIR_KEY_REQ,
	type GW_CS_VIRGIN_STATE_CFM,
	type GW_CS_VIRGIN_STATE_REQ,
	type GW_DELETE_GROUP_CFM,
	GW_DELETE_GROUP_REQ,
	type GW_DELETE_SCENE_CFM,
	GW_DELETE_SCENE_REQ,
	type GW_GET_ACTIVATION_LOG_HEADER_CFM,
	type GW_GET_ACTIVATION_LOG_HEADER_REQ,
	type GW_GET_ACTIVATION_LOG_LINE_CFM,
	type GW_GET_ACTIVATION_LOG_LINE_REQ,
	type GW_GET_ALL_GROUPS_INFORMATION_CFM,
	type GW_GET_ALL_GROUPS_INFORMATION_REQ,
	type GW_GET_ALL_NODES_INFORMATION_CFM,
	type GW_GET_ALL_NODES_INFORMATION_REQ,
	type GW_GET_CONTACT_INPUT_LINK_LIST_CFM,
	type GW_GET_CONTACT_INPUT_LINK_LIST_REQ,
	type GW_GET_GROUP_INFORMATION_CFM,
	type GW_GET_GROUP_INFORMATION_REQ,
	type GW_GET_LIMITATION_STATUS_CFM,
	type GW_GET_LIMITATION_STATUS_REQ,
	type GW_GET_LOCAL_TIME_CFM,
	type GW_GET_LOCAL_TIME_REQ,
	type GW_GET_MULTIPLE_ACTIVATION_LOG_LINES_CFM,
	type GW_GET_MULTIPLE_ACTIVATION_LOG_LINES_REQ,
	type GW_GET_NETWORK_SETUP_CFM,
	type GW_GET_NETWORK_SETUP_REQ,
	type GW_GET_NODE_INFORMATION_CFM,
	type GW_GET_NODE_INFORMATION_REQ,
	type GW_GET_PROTOCOL_VERSION_CFM,
	type GW_GET_PROTOCOL_VERSION_REQ,
	type GW_GET_SCENE_INFORMATION_CFM,
	type GW_GET_SCENE_INFORMATION_REQ,
	type GW_GET_SCENE_LIST_CFM,
	type GW_GET_SCENE_LIST_REQ,
	GW_GET_STATE_CFM,
	type GW_GET_STATE_REQ,
	type GW_GET_VERSION_CFM,
	type GW_GET_VERSION_REQ,
	type GW_HOUSE_STATUS_MONITOR_DISABLE_CFM,
	type GW_HOUSE_STATUS_MONITOR_DISABLE_REQ,
	type GW_HOUSE_STATUS_MONITOR_ENABLE_CFM,
	type GW_HOUSE_STATUS_MONITOR_ENABLE_REQ,
	type GW_INITIALIZE_SCENE_CANCEL_CFM,
	GW_INITIALIZE_SCENE_CANCEL_REQ,
	type GW_INITIALIZE_SCENE_CFM,
	type GW_INITIALIZE_SCENE_NTF,
	GW_INITIALIZE_SCENE_REQ,
	type GW_LEAVE_LEARN_STATE_CFM,
	type GW_LEAVE_LEARN_STATE_REQ,
	type GW_MODE_SEND_CFM,
	type GW_MODE_SEND_REQ,
	type GW_NEW_GROUP_CFM,
	GW_NEW_GROUP_REQ,
	type GW_PASSWORD_CHANGE_CFM,
	type GW_PASSWORD_CHANGE_REQ,
	type GW_PASSWORD_ENTER_CFM,
	type GW_PASSWORD_ENTER_REQ,
	GW_REBOOT_CFM,
	type GW_REBOOT_REQ,
	type GW_RECORD_SCENE_CFM,
	type GW_RECORD_SCENE_NTF,
	GW_RECORD_SCENE_REQ,
	type GW_REMOVE_CONTACT_INPUT_LINK_CFM,
	type GW_REMOVE_CONTACT_INPUT_LINK_REQ,
	type GW_RENAME_SCENE_CFM,
	GW_RENAME_SCENE_REQ,
	type GW_RTC_SET_TIME_ZONE_CFM,
	type GW_RTC_SET_TIME_ZONE_REQ,
	GW_SESSION_FINISHED_NTF,
	type GW_SET_CONTACT_INPUT_LINK_CFM,
	type GW_SET_CONTACT_INPUT_LINK_REQ,
	type GW_SET_FACTORY_DEFAULT_CFM,
	type GW_SET_FACTORY_DEFAULT_REQ,
	type GW_SET_GROUP_INFORMATION_CFM,
	type GW_SET_GROUP_INFORMATION_REQ,
	type GW_SET_LIMITATION_CFM,
	type GW_SET_LIMITATION_REQ,
	type GW_SET_NETWORK_SETUP_CFM,
	type GW_SET_NETWORK_SETUP_REQ,
	type GW_SET_NODE_NAME_CFM,
	type GW_SET_NODE_NAME_REQ,
	type GW_SET_NODE_ORDER_AND_PLACEMENT_CFM,
	type GW_SET_NODE_ORDER_AND_PLACEMENT_REQ,
	type GW_SET_NODE_VARIATION_CFM,
	type GW_SET_NODE_VARIATION_REQ,
	type GW_SET_UTC_CFM,
	type GW_SET_UTC_REQ,
	type GW_STATUS_REQUEST_CFM,
	GW_STATUS_REQUEST_NTF,
	GW_STATUS_REQUEST_REQ,
	type GW_STOP_SCENE_CFM,
	type GW_STOP_SCENE_REQ,
	type GW_WINK_SEND_CFM,
	type GW_WINK_SEND_REQ,
	type IConnection,
	type IGW_FRAME,
	type IGW_FRAME_RCV,
	type IGW_FRAME_REQ,
	InitializeSceneConfirmationStatus,
	InitializeSceneNotificationStatus,
	LimitationType,
	type NodeVariation,
	ParameterActive,
	type Product,
	Products,
	RecordSceneStatus,
	RenameSceneStatus,
	type Scene,
	Scenes,
	StatusType,
	type Velocity,
} from "klf-200-api";
import { type Job, scheduleJob } from "node-schedule";
import path from "path";
import { env } from "process";
import { timeout } from "promise-timeout";
import { checkServerIdentity as checkServerIdentityOriginal, type ConnectionOptions } from "tls";
import { fileURLToPath, pathToFileURL } from "url";
import { ConnectionTest, ConnectionTestResult } from "./connectionTest.js";
import { KLF200DeviceManagement } from "./deviceManagement/klf200DeviceManagement.js";
import { DisposalMap } from "./disposalMap.js";
import type { HasConnectionInterface, HasProductsInterface } from "./interfaces.js";
import type { ConnectionTestMessage } from "./messages/connectionTestMessage.js";
import { Setup } from "./setup.js";
import { SetupGroups } from "./setupGroups.js";
import { SetupProducts } from "./setupProducts.js";
import { SetupScenes } from "./setupScenes.js";
import type { Translate } from "./translate.js";
import { StateHelper } from "./util/stateHelper.js";
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
			SSLConnectionOptions: ConnectionOptions;
			// Or use a catch-all approach
			// [key: string]: any;
		}
	}
}

type ConnectionWatchDogHandler = (hadError: boolean) => void;

const refreshTimeoutMS = 120_000; // Wait max. 2 minutes for the notification.

type ResponsiveProductResult = {
	NodeID: number;
	FPs: number[];
};

/**
 * The adapter instance.
 */
export declare interface Klf200 {
	/** The existing events of the adapter.*/
	on(event: string, listener: (...args: any[]) => void): this;
	/** This event is fired when a new product is added.*/
	on(event: "productAdded", listener: (product: Product) => void): this;
	/** This event is fired when a product is removed.*/
	on(event: "productRemoved", listener: (productId: number) => void): this;
	/** This event is fired when a new scene is added.*/
	on(event: "sceneAdded", listener: (scene: Scene) => void): this;
	/** This event is fired when a scene is removed.*/
	on(event: "sceneRemoved", listener: (sceneId: number) => void): this;
	/** This event is fired when a new group is added.*/
	on(event: "groupAdded", listener: (group: Group) => void): this;
	/** This event is fired when a group is removed.*/
	on(event: "groupRemoved", listener: (groupId: number) => void): this;
	/** The existing events of the adapter.*/
	off(event: string, listener: (...args: any[]) => void): this;
	/** Removes the listener for the "productAdded" event.*/
	off(event: "productAdded", listener: (product: Product) => void): this;
	/** Removes the listener for the "productRemoved" event.*/
	off(event: "productRemoved", listener: (productId: number) => void): this;
	/** Removes the listener for the "sceneAdded" event.*/
	off(event: "sceneAdded", listener: (scene: Scene) => void): this;
	/** Removes the listener for the "sceneRemoved" event.*/
	off(event: "sceneRemoved", listener: (sceneId: number) => void): this;
	/** Removes the listener for the "groupAdded" event.*/
	off(event: "groupAdded", listener: (group: Group) => void): this;
	/** Removes the listener for the "groupRemoved" event.*/
	off(event: "groupRemoved", listener: (groupId: number) => void): this;
}

/**
 * The adapter class.
 */
export class Klf200 extends utils.Adapter implements HasConnectionInterface, HasProductsInterface, Translate {
	private disposables: Disposable[] = [];
	private connectionWatchDogHandler: ConnectionWatchDogHandler;
	private InShutdown: boolean;
	private disposalMap = new DisposalMap();
	private deviceManagement: KLF200DeviceManagement | undefined;

	private _Connection?: IConnection;
	/**
	 * Returns the current connection instance or undefined if the connection is not yet established.
	 *
	 * This property is only available if the connection is established.
	 */
	public get Connection(): IConnection | undefined {
		return this._Connection;
	}

	private _Gateway?: Gateway;
	/**
	 * Retrieves the current Gateway instance.
	 *
	 * @returns The current Gateway instance if available; otherwise, undefined.
	 */
	public get Gateway(): Gateway | undefined {
		return this._Gateway;
	}

	private _Groups?: Groups;
	/**
	 * Retrieves the current Groups instance.
	 *
	 * @returns The current Groups instance if available; otherwise, undefined.
	 */
	public get Groups(): Groups | undefined {
		return this._Groups;
	}

	private _Scenes?: Scenes;
	/**
	 * Retrieves the current Scenes instance.
	 *
	 * @returns The current Scenes instance if available; otherwise, undefined.
	 */
	public get Scenes(): Scenes | undefined {
		return this._Scenes;
	}

	private _Products?: Products;
	/**
	 * Retrieves the current Products instance.
	 *
	 * @returns The current Products instance if available; otherwise, undefined.
	 */
	public get Products(): Products | undefined {
		return this._Products;
	}

	private _Setup?: Setup;
	/**
	 * Retrieves the current Setup instance.
	 *
	 * @returns The current Setup instance if available; otherwise, undefined.
	 */
	public get Setup(): Setup | undefined {
		return this._Setup;
	}

	private _RebootJob?: Job;

	/**
	 * The constructor of the adapter.
	 *
	 * @param options - The options for the adapter.
	 *
	 * The constructor is called when the adapter is started.
	 * It sets up the event handlers for the adapter.
	 */
	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "klf200",
		});

		// Trace unhandled errors
		process.on("unhandledRejection", this.onUnhandledRejection.bind(this));
		process.on("uncaughtException", this.onUnhandledError.bind(this));

		this.on("ready", this.onReady.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("message", this.onMessage.bind(this));

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
	 * @param context Context object that should be used for substitutions in the translation.
	 * @example
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld": "Hallo Welt!"
	 * // }
	 * // returns 'Hallo Welt!'
	 * await translateTo('de', 'helloworld');
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
		}
		return text;
	}

	/**
	 * Returns the translated text of the given textKey in the system language.
	 *
	 * @param textKey Key of the text in the i18n json files that should be translated.
	 * @param context Context object that should be used for substitutions in the translation.
	 * @example
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld": "Hallo Welt!"
	 * // }
	 * // returns 'Hallo Welt!'
	 * await translate('helloworld');
	 * @example
	 * // ./admin/i18n/de/translations.json:
	 * // {
	 * //     "helloworld-parameter": "Hallo {who}!"
	 * // }
	 * // returns 'Hallo Welt!'
	 * await translate('helloworld-parameter', { who: 'Welt' });
	 */
	public async translate(textKey: string, context?: Record<string, string>): Promise<string> {
		return this.translateTo(this.language || "en", textKey, context);
	}

	private allLanguagesLoaded = false;

	/**
	 * Returns an object containing all translations of the given textKey.
	 *
	 * @param textKey Key of the text in the i18n json files that should be translated.
	 * @param context Context object that should be used for substitutions in the translation.
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

	private async setupTestConnectionStates(): Promise<void> {
		this.log.info("Setup objects for test connection.");

		await this.setObjectNotExistsAsync("TestConnection", {
			type: "channel",
			common: {
				name: "TestConnection",
				expert: true,
			},
			native: {},
		});

		await StateHelper.createAndSetStateAsync(
			this,
			"TestConnection.running",
			{
				name: "running",
				role: "indicator.state",
				type: "boolean",
				read: true,
				write: true,
				def: false,
				desc: "Test connection is running",
				expert: true,
			},
			{},
			false,
		);

		await StateHelper.createAndSetStateAsync(
			this,
			"TestConnection.testResults",
			{
				name: "testResults",
				role: "state",
				type: "object",
				read: true,
				write: true,
				def: "[]",
				desc: "Test connection results",
				expert: true,
			},
			{},
			"[]",
		);
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

			try {
				this.log.info(`klf-200-api version: ${await this.getKlfApiVersion()}`);
			} catch (error) {
				this.log.warn(
					`Error occurred when reading the version of the klf-200-api package: ${JSON.stringify(error)}`,
				);
			}
			this.log.info(`Host: ${this.config.host}`);

			await this.setupTestConnectionStates();

			// Setup connection and initialize objects and states
			if (!this.config.advancedSSLConfiguration) {
				this.log.debug("Regular login.");
				this._Connection = new Connection(this.config.host);
			} else if (this.config.SSLConnectionOptions) {
				this.log.debug(
					`Debug login with SSL ConnectionOptions: ${JSON.stringify(this.config.SSLConnectionOptions)}`,
				);
				this._Connection = new Connection(this.config.host, this.config.SSLConnectionOptions);
			} else {
				this.log.debug(
					`Advanced login with SSL public key: ${this.config.SSLPublicKey} and fingerprint: ${this.config.SSLFingerprint}`,
				);
				this._Connection = new Connection(
					this.config.host,
					Buffer.from(this.config.SSLPublicKey),
					this.config.SSLFingerprint,
				);
			}

			// Overwrite the default timeout for the sendFrameAsync method
			const SEND_FRAME_TIMEOUT = env.SEND_FRAME_TIMEOUT;
			if (SEND_FRAME_TIMEOUT) {
				this.log.debug(`Overwriting sendFrameAsync timeout to ${SEND_FRAME_TIMEOUT}s`);

				const originalSendFrameAsync = this._Connection.sendFrameAsync.bind(this._Connection);

				// Wrapped into an IIFE due to linting error FunctionDelcarationInBlock.
				// Unfortunately, Typescript overcomplicates the implementation due to the fact
				// that every overload has to be specified.
				const sendFrameAsyncOverwritten = (() => {
					function sendFrameAsyncOverwritten(frame: GW_REBOOT_REQ, timeout?: number): Promise<GW_REBOOT_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_SET_FACTORY_DEFAULT_REQ,
						timeout?: number,
					): Promise<GW_SET_FACTORY_DEFAULT_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_VERSION_REQ,
						timeout?: number,
					): Promise<GW_GET_VERSION_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_PROTOCOL_VERSION_REQ,
						timeout?: number,
					): Promise<GW_GET_PROTOCOL_VERSION_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_STATE_REQ,
						timeout?: number,
					): Promise<GW_GET_STATE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_LEAVE_LEARN_STATE_REQ,
						timeout?: number,
					): Promise<GW_LEAVE_LEARN_STATE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_NETWORK_SETUP_REQ,
						timeout?: number,
					): Promise<GW_GET_NETWORK_SETUP_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_SET_NETWORK_SETUP_REQ,
						timeout?: number,
					): Promise<GW_SET_NETWORK_SETUP_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_CS_GET_SYSTEMTABLE_DATA_REQ,
						timeout?: number,
					): Promise<GW_CS_GET_SYSTEMTABLE_DATA_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_CS_DISCOVER_NODES_REQ,
						timeout?: number,
					): Promise<GW_CS_DISCOVER_NODES_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_CS_REMOVE_NODES_REQ,
						timeout?: number,
					): Promise<GW_CS_REMOVE_NODES_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_CS_VIRGIN_STATE_REQ,
						timeout?: number,
					): Promise<GW_CS_VIRGIN_STATE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_CS_CONTROLLER_COPY_REQ,
						timeout?: number,
					): Promise<GW_CS_CONTROLLER_COPY_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_CS_RECEIVE_KEY_REQ,
						timeout?: number,
					): Promise<GW_CS_RECEIVE_KEY_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_CS_GENERATE_NEW_KEY_REQ,
						timeout?: number,
					): Promise<GW_CS_GENERATE_NEW_KEY_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_CS_REPAIR_KEY_REQ,
						timeout?: number,
					): Promise<GW_CS_REPAIR_KEY_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_CS_ACTIVATE_CONFIGURATION_MODE_REQ,
						timeout?: number,
					): Promise<GW_CS_ACTIVATE_CONFIGURATION_MODE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_NODE_INFORMATION_REQ,
						timeout?: number,
					): Promise<GW_GET_NODE_INFORMATION_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_ALL_NODES_INFORMATION_REQ,
						timeout?: number,
					): Promise<GW_GET_ALL_NODES_INFORMATION_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_SET_NODE_VARIATION_REQ,
						timeout?: number,
					): Promise<GW_SET_NODE_VARIATION_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_SET_NODE_NAME_REQ,
						timeout?: number,
					): Promise<GW_SET_NODE_NAME_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_SET_NODE_ORDER_AND_PLACEMENT_REQ,
						timeout?: number,
					): Promise<GW_SET_NODE_ORDER_AND_PLACEMENT_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_GROUP_INFORMATION_REQ,
						timeout?: number,
					): Promise<GW_GET_GROUP_INFORMATION_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_SET_GROUP_INFORMATION_REQ,
						timeout?: number,
					): Promise<GW_SET_GROUP_INFORMATION_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_DELETE_GROUP_REQ,
						timeout?: number,
					): Promise<GW_DELETE_GROUP_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_NEW_GROUP_REQ,
						timeout?: number,
					): Promise<GW_NEW_GROUP_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_ALL_GROUPS_INFORMATION_REQ,
						timeout?: number,
					): Promise<GW_GET_ALL_GROUPS_INFORMATION_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_HOUSE_STATUS_MONITOR_ENABLE_REQ,
						timeout?: number,
					): Promise<GW_HOUSE_STATUS_MONITOR_ENABLE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_HOUSE_STATUS_MONITOR_DISABLE_REQ,
						timeout?: number,
					): Promise<GW_HOUSE_STATUS_MONITOR_DISABLE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_COMMAND_SEND_REQ,
						timeout?: number,
					): Promise<GW_COMMAND_SEND_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_STATUS_REQUEST_REQ,
						timeout?: number,
					): Promise<GW_STATUS_REQUEST_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_WINK_SEND_REQ,
						timeout?: number,
					): Promise<GW_WINK_SEND_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_SET_LIMITATION_REQ,
						timeout?: number,
					): Promise<GW_SET_LIMITATION_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_LIMITATION_STATUS_REQ,
						timeout?: number,
					): Promise<GW_GET_LIMITATION_STATUS_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_MODE_SEND_REQ,
						timeout?: number,
					): Promise<GW_MODE_SEND_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_INITIALIZE_SCENE_REQ,
						timeout?: number,
					): Promise<GW_INITIALIZE_SCENE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_INITIALIZE_SCENE_CANCEL_REQ,
						timeout?: number,
					): Promise<GW_INITIALIZE_SCENE_CANCEL_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_RECORD_SCENE_REQ,
						timeout?: number,
					): Promise<GW_RECORD_SCENE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_DELETE_SCENE_REQ,
						timeout?: number,
					): Promise<GW_DELETE_SCENE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_RENAME_SCENE_REQ,
						timeout?: number,
					): Promise<GW_RENAME_SCENE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_SCENE_LIST_REQ,
						timeout?: number,
					): Promise<GW_GET_SCENE_LIST_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_SCENE_INFORMATION_REQ,
						timeout?: number,
					): Promise<GW_GET_SCENE_INFORMATION_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_ACTIVATE_SCENE_REQ,
						timeout?: number,
					): Promise<GW_ACTIVATE_SCENE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_STOP_SCENE_REQ,
						timeout?: number,
					): Promise<GW_STOP_SCENE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_ACTIVATE_PRODUCTGROUP_REQ,
						timeout?: number,
					): Promise<GW_ACTIVATE_PRODUCTGROUP_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_CONTACT_INPUT_LINK_LIST_REQ,
						timeout?: number,
					): Promise<GW_GET_CONTACT_INPUT_LINK_LIST_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_SET_CONTACT_INPUT_LINK_REQ,
						timeout?: number,
					): Promise<GW_SET_CONTACT_INPUT_LINK_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_REMOVE_CONTACT_INPUT_LINK_REQ,
						timeout?: number,
					): Promise<GW_REMOVE_CONTACT_INPUT_LINK_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_ACTIVATION_LOG_HEADER_REQ,
						timeout?: number,
					): Promise<GW_GET_ACTIVATION_LOG_HEADER_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_CLEAR_ACTIVATION_LOG_REQ,
						timeout?: number,
					): Promise<GW_CLEAR_ACTIVATION_LOG_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_ACTIVATION_LOG_LINE_REQ,
						timeout?: number,
					): Promise<GW_GET_ACTIVATION_LOG_LINE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_MULTIPLE_ACTIVATION_LOG_LINES_REQ,
						timeout?: number,
					): Promise<GW_GET_MULTIPLE_ACTIVATION_LOG_LINES_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_SET_UTC_REQ,
						timeout?: number,
					): Promise<GW_SET_UTC_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_RTC_SET_TIME_ZONE_REQ,
						timeout?: number,
					): Promise<GW_RTC_SET_TIME_ZONE_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_GET_LOCAL_TIME_REQ,
						timeout?: number,
					): Promise<GW_GET_LOCAL_TIME_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_PASSWORD_ENTER_REQ,
						timeout?: number,
					): Promise<GW_PASSWORD_ENTER_CFM>;
					function sendFrameAsyncOverwritten(
						frame: GW_PASSWORD_CHANGE_REQ,
						timeout?: number,
					): Promise<GW_PASSWORD_CHANGE_CFM>;
					function sendFrameAsyncOverwritten(frame: IGW_FRAME_REQ, timeout?: number): Promise<IGW_FRAME_RCV>;
					function sendFrameAsyncOverwritten(
						frame: IGW_FRAME_REQ,
						_timeout?: number,
					): Promise<IGW_FRAME_RCV> {
						return originalSendFrameAsync(frame, Number.parseInt(SEND_FRAME_TIMEOUT!));
					}

					return sendFrameAsyncOverwritten;
				})();

				this._Connection.sendFrameAsync = sendFrameAsyncOverwritten;
			}

			try {
				await this.Connection?.loginAsync(this.config.password);
			} catch (error: any) {
				this.log.error(`${error}`);
				this.log.debug(`${(error as Error).stack}`);
				this.log.error(`Login to KLF-200 device at ${this.config.host} failed.`);
				this.log.error(`Please use the Test Connection button in the settings dialog of the adapter.`);
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

		this.log.info(`Checking for unresponsive products...`);
		const productLimitationError = new Set<string>();
		const responsiveProducts = await this.checkResponsiveProducts(
			this._Products.Products.filter(product => product).map(product => product.NodeID),
		);
		for (const product of this._Products.Products) {
			if (product) {
				const responsiveProduct = responsiveProducts.find(
					responsiveProduct => responsiveProduct.NodeID === product.NodeID,
				);
				if (responsiveProduct === undefined) {
					this.log.warn(`Product ${product.NodeID} is not responding.`);
					for (const parameterActive of [
						ParameterActive.MP,
						ParameterActive.FP1,
						ParameterActive.FP2,
						ParameterActive.FP3,
						ParameterActive.FP4,
					]) {
						const productLimitationErrorEntry = JSON.stringify([product.NodeID, parameterActive]);
						productLimitationError.add(productLimitationErrorEntry);
					}
				} else {
					for (const parameterActive of [
						ParameterActive.FP1,
						ParameterActive.FP2,
						ParameterActive.FP3,
						ParameterActive.FP4,
					]) {
						if (!responsiveProduct.FPs.includes(parameterActive)) {
							const productLimitationErrorEntry = JSON.stringify([product.NodeID, parameterActive]);
							productLimitationError.add(productLimitationErrorEntry);
						}
					}
				}
			}
		}

		this.log.info(`Reading product limitations...`);
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
							this.log.debug(
								`Reading product limitation: ${product.NodeID}:${ParameterActive[parameterActive]}`,
							);
							await product.refreshLimitationAsync(limitationType, parameterActive);
						} catch (error) {
							if (
								error instanceof Error &&
								(error.message.startsWith("Unexpected node ID") ||
									error.message.startsWith("Unexpected parameter ID"))
							) {
								this.log.debug(
									`Skipping product limitation for ${product.NodeID}:${ParameterActive[parameterActive]}: ${error.message}`,
								);
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

	private async checkResponsiveProducts(productIds: number[]): Promise<ResponsiveProductResult[]> {
		const responsiveProducts: ResponsiveProductResult[] = [];
		const chunkSize = 20;
		for (let i = 0; i < Math.ceil(productIds.length / chunkSize); i++) {
			let sessionId = -1;
			let handler: Disposable | undefined = undefined;
			const handlerPromise = timeout(
				new Promise<ResponsiveProductResult[]>((resolve, reject) => {
					try {
						handler = this._Connection?.on(
							event => {
								if (event instanceof GW_SESSION_FINISHED_NTF && event.SessionID === sessionId) {
									handler?.dispose();
									handler = undefined;
									resolve(responsiveProducts);
								} else if (event instanceof GW_STATUS_REQUEST_NTF && event.SessionID === sessionId) {
									responsiveProducts.push({
										NodeID: event.NodeID,
										FPs: event.ParameterData?.map(parameter => parameter.ID) || [],
									});
								}
							},
							[GatewayCommand.GW_SESSION_FINISHED_NTF, GatewayCommand.GW_STATUS_REQUEST_NTF],
						);
					} catch (error) {
						reject(error as Error);
					}
				}),
				30_000,
			);
			const statusRequestReq = new GW_STATUS_REQUEST_REQ(
				productIds.slice(i * chunkSize, (i + 1) * chunkSize),
				StatusType.RequestCurrentPosition,
				[1, 2, 3, 4],
			);
			sessionId = statusRequestReq.SessionID;
			const statusRequestCfm = await this._Connection?.sendFrameAsync(statusRequestReq);
			if (statusRequestCfm?.CommandStatus === CommandStatus.CommandAccepted) {
				await handlerPromise;
			} else {
				return Promise.reject(new Error(statusRequestCfm?.getError()));
			}
		}
		return responsiveProducts.sort();
	}

	private async disposeOnConnectionClosed(): Promise<void> {
		// Remove watchdog handler from socket
		this.log.info(`Remove socket listener...`);
		this.Connection?.KLF200SocketProtocol?.socket.off("close", this.connectionWatchDogHandler);

		// Disconnect all event handlers
		this.log.info(`Shutting down event handlers...`);
		this.disposables.forEach(disposable => {
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
			}

			return value;
		});
	}

	private async onReboot(): Promise<void> {
		this.log.info("Automatic reboot due to schedule in configuration");
		this.Setup?.stopStateTimer();
		await this.setState(`gateway.RebootGateway`, true, false);
	}

	/**
	 * Discover new Products
	 *
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
					frame => {
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
					[...addedProductPromiseMap.values(), ...removedProductPromiseMap.values()].map(pm => pm.promise),
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

	/**
	 * Remove a product from the adapter.
	 * This function will remove the product from the adapter and notify the user when the removal is finished.
	 *
	 * @param productId The product ID to remove.
	 * @returns A promise that resolves when the product has been successfully removed.
	 */
	public async onRemoveProduct(productId: number): Promise<void> {
		let resolve: (value: void | PromiseLike<void>) => void;
		const removedProductHandlerPromise = new Promise<void>(res => {
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

	/**
	 * Winks a product. This is used to identify a product, e.g. a window will move its handle, a roller shutter will move up and down a little bit.
	 *
	 * @param productId The ID of the product to wink.
	 * @throws Error if the product is not found in the adapter.
	 */
	public async onWinkProduct(productId: number): Promise<void> {
		const winkStateId = `products.${productId}.wink`;
		await this.setState(winkStateId, true);
	}

	/**
	 * Renames a product to a new name.
	 *
	 * @param productId The ID of the product to rename.
	 * @param newName The new name for the product.
	 * @throws Error if the product is not found in the adapter.
	 */
	public async onRenameProduct(productId: number, newName: string): Promise<void> {
		const product = this.Products?.Products[productId];

		if (!product) {
			throw new Error(`Product with ID ${productId} not found in adapter.`);
		}

		await product?.setNameAsync(newName);
	}

	/**
	 * Adds a new group with the given name, products, and settings. Returns the ID of the newly created group.
	 *
	 * @param groupName - The name of the group to create.
	 * @param products - The IDs of the products to add to the group.
	 * @param order - The custom sort order of the group. Optional.
	 * @param placement - The placement of the group. Optional.
	 * @param velocity - The velocity of the group. Optional.
	 * @param nodeVariation - The node variation of the group. Optional.
	 * @returns The ID of the newly created group.
	 */
	public async onAddGroup(
		groupName: string,
		products: number[],
		order?: number,
		placement?: number,
		velocity?: Velocity,
		nodeVariation?: NodeVariation,
	): Promise<number> {
		let resolve: (value: void | PromiseLike<void>) => void;
		const addGroupHandlerPromise = new Promise<void>(res => {
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

	/**
	 * Changes a group.
	 *
	 * @param groupId The ID of the group to change.
	 * @param groupName The new name of the group.
	 * @param products The new list of products in the group.
	 * @param order The new order for sorting the groups. If not provided, the current order is used.
	 * @param placement The new placement for the group. If not provided, the current placement is used.
	 * @param velocity The new velocity for the group. If not provided, the current velocity is used.
	 * @param nodeVariation The new node variation for the group. If not provided, the current node variation is used.
	 * @returns A promise that resolves when the group has been changed successfully.
	 * @throws {Error} If the group ID is invalid.
	 * @throws {Error} If the request failed.
	 * @throws {Error} If the response contains an unknown status code.
	 */
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

	/**
	 * Removes a group.
	 *
	 * @param groupId The ID of the group to remove.
	 * @returns A promise that resolves when the group has been removed successfully.
	 * @throws {Error} If the group ID is invalid.
	 * @throws {Error} If the request failed.
	 * @throws {Error} If the response contains an unknown status code.
	 */
	public async onRemoveGroup(groupId: number): Promise<void> {
		let resolve: (value: void | PromiseLike<void>) => void;
		const removedGroupHandlerPromise = new Promise<void>(res => {
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

	/**
	 * Deletes a scene from the gateway.
	 *
	 * @param sceneId The ID of the scene to delete.
	 * @throws {Error} If the scene ID is invalid.
	 */
	public async onRemoveScene(sceneId: number): Promise<void> {
		let resolve: (value: void | PromiseLike<void>) => void;
		const removedSceneHandlerPromise = new Promise<void>(res => {
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

	/**
	 * Renames a scene to a new name.
	 *
	 * @param sceneId The scene ID to rename.
	 * @param newName The new name to use for the scene.
	 * @throws Error If the scene ID is invalid or if the new name is already in use.
	 */
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

	/**
	 * Initializes a new scene on the gateway.
	 * After calling this function, the gateway will send a GW_INITIALIZE_SCENE_NTF
	 * frame as soon as the scene has been initialized. The frame will contain the
	 * IDs of all products that could not be initialized.
	 *
	 * @returns A promise that resolves with an array of IDs of products that could not be initialized.
	 * @throws If the system table is empty, or if the gateway is out of storage.
	 * @throws If the initialization of the scene fails for any other reason.
	 */
	public async onNewSceneInitialize(): Promise<number[]> {
		let disposable: Disposable | undefined;
		try {
			const sceneInitializationNotificationPromise = new Promise<number[]>((resolve, reject) => {
				disposable = this.Connection?.on(
					frame => {
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

	/**
	 * Cancels the current new scene recording.
	 *
	 * This will cancel the current scene recording and leave the scene in its
	 * previous state.
	 *
	 * @returns A promise that resolves once the cancellation has been confirmed by
	 * the gateway.
	 */
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

	/**
	 * Save a new scene with the given name.
	 *
	 * This will trigger the recording of a new scene. The scene will be saved
	 * once the recording is finished.
	 *
	 * @param sceneName The name of the scene to save.
	 * @returns The ID of the new scene.
	 */
	public async onNewSceneSave(sceneName: string): Promise<number> {
		let disposable: Disposable | undefined;
		try {
			const sceneNotificationReceivedPromise = new Promise<number>((resolve, reject) => {
				disposable = this.Connection?.on(
					frame => {
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
						reject(error as Error);
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
	 * @returns The version of the klf-200-api module.
	 */
	private async getKlfApiVersion(): Promise<string> {
		// Try to resolve klf-200-api/package.json using import.meta.resolve (Node.js 20+)
		let klf200PackageJsonUrl: URL | undefined;
		if (typeof (import.meta as any).resolve === "function") {
			try {
				const resolved = await (import.meta as any).resolve("klf-200-api/package.json", import.meta.url);
				klf200PackageJsonUrl = new URL(resolved);
			} catch {
				// fallback below
			}
		}

		// Fallback: try to find klf-200-api/package.json relative to this file
		if (!klf200PackageJsonUrl) {
			// __dirname equivalent in ESM
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = path.dirname(__filename);

			// Look for klf-200-api in node_modules or parallel folder
			const possiblePaths = [
				path.join(__dirname, "node_modules", "klf-200-api", "package.json"),
				path.join(__dirname, "..", "klf-200-api", "package.json"),
				path.join(__dirname, "..", "node_modules", "klf-200-api", "package.json"),
				path.join(__dirname, "..", "..", "klf-200-api", "package.json"),
			];
			for (const p of possiblePaths) {
				try {
					await fs.access(p, fs.constants.R_OK);
					klf200PackageJsonUrl = pathToFileURL(p);
					break;
				} catch {
					// try next
				}
			}
		}

		if (!klf200PackageJsonUrl) {
			throw new Error("Could not locate klf-200-api/package.json");
		}

		const moduleInfo = JSON.parse(await fs.readFile(klf200PackageJsonUrl, "utf8")) as { version: string };
		return moduleInfo.version;
	}

	private async runConnectionTests(
		hostname: string,
		password: string,
		connectionOptions?: ConnectionOptions,
		progressCallback?: (progress: ConnectionTestResult[]) => Promise<void>,
	): Promise<ConnectionTestResult[]> {
		const connectionTest = new ConnectionTest(this);
		return await connectionTest.runTests(hostname, password, connectionOptions, progressCallback);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param callback callback to be called under any circumstances
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
	 *
	 * @param id The state ID
	 * @param state The new state
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

	private logLastConnectionTestResultStep(progress: ConnectionTestResult[]): void {
		this.log.silly(
			`Logging the last run step of the connection test of the progress: ${JSON.stringify(this.convertProgressErrors(progress))}`,
		);
		const lastResultRun = progress.findLast(progress => progress.run);
		if (lastResultRun !== undefined) {
			this.log.info(
				`Connection test step ${lastResultRun.stepOrder}: ${lastResultRun.stepName} - ${lastResultRun.success ? "✅" : "❌"}.${lastResultRun.result !== undefined ? ` Result: ${String(lastResultRun.result)}` : ""} Message: ${lastResultRun.message}.`,
			);
		}
	}

	private convertProgressErrors(progress: ConnectionTestResult[]): ConnectionTestResult[] {
		return progress.map(result => {
			return new ConnectionTestResult(
				result.stepOrder,
				result.stepName,
				result.run,
				result.success,
				result.message,
				result.result instanceof Error ? result.result.message : result.result,
			);
		});
	}

	private createConnectionOptions(data: ConnectionTestMessage): ConnectionOptions {
		const klf200Connection = new Connection(
			data.hostname,
			data.advancedSSLConfiguration?.sslPublicKey !== undefined
				? Buffer.from(data.advancedSSLConfiguration?.sslPublicKey)
				: undefined,
			data.advancedSSLConfiguration?.sslFingerprint,
		);
		return {
			rejectUnauthorized: true,
			ca: klf200Connection.CA,
			checkServerIdentity: (host, cert) => {
				if (cert.fingerprint === klf200Connection.fingerprint) {
					return undefined;
				}
				return checkServerIdentityOriginal(host, cert);
			},
		};
	}

	/**
	 * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	 * Using this method requires "common.message" property to be set to true in io-package.json
	 *
	 * @param obj The received message
	 */
	private onMessage(obj: ioBroker.Message): void {
		this.log.debug(`Message received: ${JSON.stringify(obj)}`);

		if (typeof obj === "object" && obj.message) {
			if (obj.command === "ConnectionTest") {
				this.handleMessageConnectionTest(obj).catch(error => this.log.error((error as Error).message));
			}
		}
	}

	private async handleMessageConnectionTest(obj: ioBroker.Message): Promise<void> {
		const data: ConnectionTestMessage = obj.message as ConnectionTestMessage;
		this.log.info(`Starting connection test...`);

		try {
			await this.setState("TestConnection.testResults", "[]", true);
			await this.setState("TestConnection.running", true, true);
			const result = await this.runConnectionTests(
				data.hostname,
				this.decrypt(data.password),
				this.createConnectionOptions(data),
				async (progress: ConnectionTestResult[]): Promise<void> => {
					try {
						this.logLastConnectionTestResultStep(progress);
						const cleansedProgress = this.convertProgressErrors(progress);
						await this.setState("TestConnection.testResults", JSON.stringify(cleansedProgress), true);
					} catch (error: any) {
						this.log.error(`Error during connection test: ${(error as Error).message}`);
					}
				},
			);
			// Send the final result
			this.logLastConnectionTestResultStep(result);
			const cleansedResult = this.convertProgressErrors(result);
			await this.setState("TestConnection.testResults", JSON.stringify(cleansedResult), true);
			this.sendTo(obj.from, obj.command, cleansedResult, obj.callback);
		} catch (error: any) {
			this.log.error(`Error during connection test: ${(error as Error).message}`);
		} finally {
			await this.setState("TestConnection.running", false, true);
		}
	}

	/**
	 * Returns a string representation of the given error.
	 * If the error is a string, it is returned as-is.
	 * If the error is an Error, its message is returned if available, otherwise its name is returned if available, otherwise toString() is used.
	 * If the error is null or undefined, "undefined" is returned.
	 *
	 * @param err The error to convert to a string.
	 */
	getErrorMessage(err: Error | string): string {
		// Irgendwo gibt es wohl einen Fehler ohne Message
		if (err == null) {
			return "undefined";
		}
		if (typeof err === "string") {
			return err;
		}
		if (err.message != null) {
			return err.message;
		}
		if (err.name != null) {
			return err.name;
		}
		return err.toString();
	}

	/**
	 * This function is called when an unhandled promise rejection occurs. It logs the
	 * error and causes the adapter to terminate.
	 *
	 * @param reason - The reason for the promise rejection.
	 * @param promise - The promise that was rejected.
	 */
	onUnhandledRejection(reason: object | null | undefined, promise: Promise<any>): void {
		((this && this.log) || console).error(
			`Unhandled promise rejection detected. reason: ${JSON.stringify(reason)}, promise: ${JSON.stringify(
				promise,
			)}`,
		);
		this.terminate("unhandled promise rejection", 1);
	}

	/**
	 * This function is called when an unhandled error occurs. It logs the error and causes the adapter to terminate.
	 *
	 * @param error - The error that occurred.
	 */
	onUnhandledError(error: Error): void {
		((this && this.log) || console).error(`Unhandled exception occured: ${JSON.stringify(error)}`);
		this.terminate("unhandled exception", 1);
	}
}
