"use strict";

import {
	ActuatorType,
	type FunctionalParameter,
	type IConnection,
	LimitationType,
	LockTime,
	ParameterActive,
	type Product,
	type Products,
	StatusType,
} from "klf-200-api";
import type { DisposalMap } from "./disposalMap.js";
import type { HasConnectionInterface, HasProductsInterface } from "./interfaces.js";
import { levelConverter, roleConverter } from "./util/converter.js";
import {
	ComplexPropertyChangedHandler,
	ComplexStateChangeHandler,
	EchoStateChangeHandler,
	PercentagePropertyChangedHandler,
	SimplePropertyChangedHandler,
	SimpleStateChangeHandler,
} from "./util/propertyLink.js";
import { StateHelper } from "./util/stateHelper.js";
import { ArrayCount, waitForSessionFinishedNtfAsync } from "./util/utils.js";

/**
 * Class to setup products
 */
export class SetupProducts {
	/**
	 * Create all products known by the KLF 200 interface as channels in ioBroker.
	 * The function will remove all channels that are not present in the provided products list.
	 *
	 * @param adapter The adapter instance.
	 * @param products The list of products provided by the KLF 200 interface.
	 * @param disposalMap The map of objects to dispose of.
	 * @param productLimitationError A set of product IDs which have a limitation error.
	 * @returns A promise that resolves when the products have been created.
	 */
	public static async createProductsAsync(
		adapter: ioBroker.Adapter,
		products: Product[],
		disposalMap: DisposalMap,
		productLimitationError: Set<string>,
	): Promise<void> {
		// Remove old products
		const currentProductsList = await adapter.getChannelsOfAsync(`products`);
		adapter.log.debug(`Current Product List: ${JSON.stringify(currentProductsList)}`);
		// Filter current channels to contain only those, that are not present in the provided products list
		const channelsToRemove = currentProductsList.filter(
			channel =>
				!products.some(product => {
					return product && product.NodeID === Number.parseInt(channel._id.split(".").reverse()[0]);
				}),
		);
		// Delete channels
		for (const channel of channelsToRemove) {
			const channelId = channel._id.split(".").reverse()[0];
			const productId = `products.${channelId}`;
			await disposalMap.disposeId(productId);
			await adapter.delObjectAsync(productId, { recursive: true });
		}
		if (channelsToRemove.length !== 0) {
			adapter.log.info(`${channelsToRemove.length} unknown products removed.`);
		}

		for (const product of products) {
			if (product) {
				await SetupProducts.createProductAsync(adapter, product, disposalMap, productLimitationError);
			}
		}

		// Write number of products
		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.productsFound`,
			{
				name: "Number of products found",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				def: 0,
				desc: "Number of products connected to the interface",
			},
			{},
			ArrayCount(products),
		);
	}

	/**
	 * Create a single product as channel in ioBroker.
	 *
	 * @param adapter The adapter instance.
	 * @param product The product to create.
	 * @param disposalMap The map of objects to dispose of.
	 * @param productLimitationError A set of product IDs which have a limitation error.
	 * @returns A promise that resolves when the product has been created.
	 */
	public static async createProductAsync(
		adapter: ioBroker.Adapter,
		product: Product,
		disposalMap: DisposalMap,
		productLimitationError: Set<string>,
	): Promise<void> {
		adapter.log.info(`Setup objects for product ${product.Name}.`);

		const states: Record<string, string> = {};
		// Fill absolute percentage values:
		for (let pct = 0; pct <= 100; pct++) {
			states[`${(0xc800 / 100) * pct}`] = `${pct}%`;
		}
		// Fill relative percentage values:
		for (let pct = -100; pct <= 100; pct++) {
			states[`${(0x7d0 / 200) * (pct + 100) + 0xc900}`] = `${pct < 0 ? "" : "+"}${pct}%`;
		}
		// Add remaining state values:
		states[`${0xd100}`] = "Target";
		states[`${0xd200}`] = "Current";
		states[`${0xd300}`] = "Default";
		states[`${0xd400}`] = "Ignore";

		const statesReverse: Record<string, string> = {};
		// Fill absolute percentage values:
		for (let pct = 0; pct <= 100; pct++) {
			statesReverse[`${(0xc800 / 100) * (100 - pct)}`] = `${pct}%`;
		}
		// Fill relative percentage values:
		for (let pct = -100; pct <= 100; pct++) {
			statesReverse[`${(0x7d0 / 200) * (-pct + 100) + 0xc900}`] = `${pct < 0 ? "" : "+"}${pct}%`;
		}
		// Add remaining state values:
		statesReverse[`${0xd100}`] = "Target";
		statesReverse[`${0xd200}`] = "Current";
		statesReverse[`${0xd300}`] = "Default";
		statesReverse[`${0xd400}`] = "Ignore";

		const InverseProductTypes = [
			ActuatorType.WindowOpener,
			ActuatorType.Light,
			ActuatorType.OnOffSwitch,
			ActuatorType.VentilationPoint,
			ActuatorType.ExteriorHeating,
		];

		const statesLimitationTimeRaw: Record<string, string> = {};
		// Fill limitation time raw states
		for (let value = 0; value <= 252; value++) {
			statesLimitationTimeRaw[`${value}`] = `${LockTime.lockTimeValueToLockTimeForLimitation(value)} seconds`;
		}
		statesLimitationTimeRaw["253"] = "Forever";

		await adapter.extendObject(`products.${product.NodeID}`, {
			type: "channel",
			common: {
				name: product.Name,
				role: roleConverter.convert(product.TypeID),
			},
			native: {},
		});

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.category`,
			{
				name: "category",
				role: roleConverter.convert(product.TypeID),
				type: "string",
				read: true,
				write: false,
				desc: "Category of the registered product",
			},
			{},
			product.Category,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.currentPosition`,
			{
				name: "currentPosition",
				role: levelConverter.convert(product.TypeID),
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 100,
				unit: "%",
				desc: "Opening level in percent",
			},
			{},
			Math.round(product.CurrentPosition * 100),
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.currentPositionRaw`,
			{
				name: "currentPositionRaw",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xffff,
				desc: "Raw value of current position",
			},
			{},
			product.CurrentPositionRaw,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.FP1CurrentPositionRaw`,
			{
				name: "FP1CurrentPositionRaw",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xffff,
				desc: "Raw value of current position of functional parameter 1",
			},
			{},
			product.FP1CurrentPositionRaw,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.FP2CurrentPositionRaw`,
			{
				name: "FP2CurrentPositionRaw",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xffff,
				desc: "Raw value of current position of functional parameter 2",
			},
			{},
			product.FP2CurrentPositionRaw,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.FP3CurrentPositionRaw`,
			{
				name: "FP3CurrentPositionRaw",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xffff,
				desc: "Raw value of current position of functional parameter 3",
			},
			{},
			product.FP3CurrentPositionRaw,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.FP4CurrentPositionRaw`,
			{
				name: "FP4CurrentPositionRaw",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xffff,
				desc: "Raw value of current position of functional parameter 4",
			},
			{},
			product.FP4CurrentPositionRaw,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.nodeVariation`,
			{
				name: "nodeVariation",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xff,
				desc: "Node Variation",
				states: {
					0: "NotSet",
					1: "TopHung",
					2: "Kip",
					3: "FlatRoof",
					4: "SkyLight",
				},
			},
			{},
			product.NodeVariation,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.order`,
			{
				name: "order",
				role: "value",
				type: "number",
				read: true,
				write: true,
				min: 0,
				max: 0xffff,
				desc: "Custom order of products",
			},
			{},
			product.Order,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.placement`,
			{
				name: "placement",
				role: "value",
				type: "number",
				read: true,
				write: true,
				min: 0,
				max: 0xff,
				desc: "Placement (house = 0 or room number)",
			},
			{},
			product.Placement,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.powerSaveMode`,
			{
				name: "powerSaveMode",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xff,
				desc: "Power save mode",
				states: {
					0: "AlwaysAlive",
					1: "LowPowerMode",
				},
			},
			{},
			product.PowerSaveMode,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.productType`,
			{
				name: "productType",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xffff,
				desc: "Product type",
			},
			{},
			product.ProductType,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.remainingTime`,
			{
				name: "remainingTime",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xffff,
				unit: "s",
				desc: "Remaining time of current operation in seconds",
			},
			{},
			product.RemainingTime,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.runStatus`,
			{
				name: "runStatus",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xff,
				desc: "Current run status",
				states: {
					0: "ExecutionCompleted",
					1: "ExecutionFailed",
					2: "ExecutionActive",
				},
			},
			{},
			product.RunStatus,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.serialNumber`,
			{
				name: "serialNumber",
				role: "value",
				type: "string",
				read: true,
				write: false,
				desc: "Serial number",
			},
			{},
			`${product.SerialNumber.toString("hex").replace(/(..)/g, ":$1").slice(1)}`,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.state`,
			{
				name: "state",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xff,
				desc: "Operating state",
				states: {
					0: "NonExecuting",
					1: "Error",
					2: "NotUsed",
					3: "WaitingForPower",
					4: "Executing",
					5: "Done",
					255: "Unknown",
				},
			},
			{},
			product.State,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.statusReply`,
			{
				name: "statusReply",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xff,
				desc: "Status reply",
				states: {
					0: "Unknown",
					1: "Ok",
					2: "NoContact",
					3: "ManuallyOperated",
					4: "Blocked",
					5: "WrongSystemKey",
					6: "PriorityLevelLocked",
					7: "ReachedWrongPosition",
					8: "ErrorDuringExecution",
					9: "NoExecution",
					10: "Calibrating",
					11: "PowerConsumptionTooHigh",
					12: "PowerConsumptionTooLow",
					13: "LockPositionOpen",
					14: "MotionTimeTooLongCommunicationEnded",
					15: "ThermalProtection",
					16: "ProductNotOperational",
					17: "FilterMaintenanceNeeded",
					18: "BatteryLevel",
					19: "TargetModified",
					20: "ModeNotImplemented",
					21: "CommandIncompatibleToMovement",
					22: "UserAction",
					23: "DeadBoltError",
					24: "AutomaticCycleEngaged",
					25: "WrongLoadConnected",
					26: "ColourNotReachable",
					27: "TargetNotReachable",
					28: "BadIndexReceived",
					29: "CommandOverruled",
					30: "NodeWaitingForPower",
					223: "InformationCode",
					224: "ParameterLimited",
					225: "LimitationByLocalUser",
					226: "LimitationByUser",
					227: "LimitationByRain",
					228: "LimitationByTimer",
					230: "LimitationByUps",
					231: "LimitationByUnknownDevice",
					234: "LimitationBySAAC",
					235: "LimitationByWind",
					236: "LimitationByMyself",
					237: "LimitationByAutomaticCycle",
					238: "LimitationByEmergency",
				},
			},
			{},
			product.StatusReply,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.subType`,
			{
				name: "subType",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0b00111111,
				desc: "",
			},
			{},
			product.SubType,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.targetPosition`,
			{
				name: "targetPosition",
				role: levelConverter.convert(product.TypeID),
				type: "number",
				read: true,
				write: true,
				min: 0,
				max: 100,
				unit: "%",
				desc: "Target opening level in percent. Set this value to move the product to that value, e.g. open a window, move a roller shutter.",
			},
			{},
			Math.round(product.TargetPosition * 100),
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.targetPositionRaw`,
			{
				name: "targetPositionRaw",
				role: "value",
				type: "number",
				read: true,
				write: true,
				min: 0,
				max: 0xffff,
				desc: "Target position raw value",
				states: InverseProductTypes.indexOf(product.TypeID) === -1 ? states : statesReverse,
			},
			{},
			product.TargetPositionRaw,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.timestamp`,
			{
				name: "timestamp",
				role: "value",
				type: "string",
				read: true,
				write: false,
				desc: "Timestamp of the last data",
			},
			{},
			product.TimeStamp.toString(),
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.typeID`,
			{
				name: "typeID",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0b0000001111111111,
				desc: "Product type",
				states: {
					0: "NO_TYPE",
					1: "VenetianBlind",
					2: "RollerShutter",
					3: "Awning",
					4: "WindowOpener",
					5: "GarageOpener",
					6: "Light",
					7: "GateOpener",
					8: "RollingDoorOpener",
					9: "Lock",
					10: "Blind",
					12: "Beacon",
					13: "DualShutter",
					14: "HeatingTemperatureInterface",
					15: "OnOffSwitch",
					16: "HorizontalAwning",
					17: "ExternalVentianBlind",
					18: "LouvreBlind",
					19: "CurtainTrack",
					20: "VentilationPoint",
					21: "ExteriorHeating",
					22: "HeatPump",
					23: "IntrusionAlarm",
					24: "SwingingShutter",
				},
			},
			{},
			product.TypeID,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.velocity`,
			{
				name: "velocity",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				max: 0xff,
				desc: "Velocity of the product",
				states: {
					0: "Default",
					1: "Silent",
					2: "Fast",
					255: "NotAvailable",
				},
			},
			{},
			product.Velocity,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.stop`,
			{
				name: "stop",
				role: "button.play",
				type: "boolean",
				read: false,
				write: true,
				desc: "Set to true to stop the current operation",
			},
			{},
			false,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.wink`,
			{
				name: "wink",
				role: "button.play",
				type: "boolean",
				read: false,
				write: true,
				desc: "Set to true to let the product wink",
			},
			{},
			false,
		);

		for (const parameterCounter of [1, 2, 3, 4]) {
			const stateName = `targetFP${parameterCounter}Raw`;
			const common: ioBroker.StateCommon = {
				name: stateName,
				role: "value",
				type: "number",
				read: false,
				write: true,
				min: 0,
				max: 0xffff,
				desc: "Target position raw value",
				def: 0xd400, // Ignore value
				states: states,
			};

			await StateHelper.createAndSetStateAsync(
				adapter,
				`products.${product.NodeID}.${stateName}`,
				common,
				{},
				0xd400,
			);
		}

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.refreshProduct`,
			{
				name: "refreshProduct",
				role: "button.play",
				type: "boolean",
				read: false,
				write: true,
				desc: "Set to true to re-read the state of the product from the KLF-200",
			},
			{},
			false,
		);

		/*
			Limitation states
		*/

		for (const parameter of [
			ParameterActive.MP,
			ParameterActive.FP1,
			ParameterActive.FP2,
			ParameterActive.FP3,
			ParameterActive.FP4,
		]) {
			if (!productLimitationError.has(JSON.stringify([product.NodeID, parameter]))) {
				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}MinRaw`,
					{
						name: `limitation${ParameterActive[parameter]}MinRaw`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						max: 0xffff,
						desc: `Min limitation of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`} raw value`,
						states: InverseProductTypes.indexOf(product.TypeID) === -1 ? states : statesReverse,
					},
					{},
					product.getLimitationMinRaw(parameter),
				);

				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}MaxRaw`,
					{
						name: `limitation${ParameterActive[parameter]}MaxRaw`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						max: 0xffff,
						desc: `Max limitation of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`} raw value`,
						states: InverseProductTypes.indexOf(product.TypeID) === -1 ? states : statesReverse,
					},
					{},
					product.getLimitationMaxRaw(parameter),
				);

				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}Min`,
					{
						name: `limitation${ParameterActive[parameter]}Min`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						max: 100,
						unit: "%",
						desc: `Min limitation of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`} in percent`,
					},
					{},
					Math.round(product.getLimitationMin(parameter) * 100),
				);

				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}Max`,
					{
						name: `limitation${ParameterActive[parameter]}Max`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						max: 100,
						unit: "%",
						desc: `Max limitation of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`} in percent`,
					},
					{},
					Math.round(product.getLimitationMax(parameter) * 100),
				);

				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}Originator`,
					{
						name: `limitation${ParameterActive[parameter]}Originator`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						max: 255,
						desc: `DEPRECATED! Use the min/max version of this state: Origin of the limitation for ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`}`,
						states: {
							1: "User remote control",
							2: "Rain sensor",
							3: "Timer controlled",
							5: "UPS unit",
							8: "Stand alone automatic controls (SAAC)",
							9: "Wind sensor",
							11: "Electric load shed",
							12: "Local light sensor",
							13: "Unspecified environment sensor",
							255: "Emergency controlled",
						},
					},
					{},
					product.getLimitationOriginator(parameter),
				);
				adapter.log.warn(
					`The state products.${product.NodeID}.limitation${ParameterActive[parameter]}Originator will be removed in the next major release. Use products.${product.NodeID}.limitation${ParameterActive[parameter]}OriginatorMin and products.${product.NodeID}.limitation${ParameterActive[parameter]}OriginatorMax instead!` +
						` If you don't use this state in your own scripts, aliases, visualizations or somewhere else you can safely ignore this message. Please don't open any issues regarding this informational message.`,
				);

				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}OriginatorMin`,
					{
						name: `limitation${ParameterActive[parameter]}OriginatorMin`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						max: 255,
						desc: `Origin of the limitation for the min value of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`}`,
						states: {
							1: "User remote control",
							2: "Rain sensor",
							3: "Timer controlled",
							5: "UPS unit",
							8: "Stand alone automatic controls (SAAC)",
							9: "Wind sensor",
							11: "Electric load shed",
							12: "Local light sensor",
							13: "Unspecified environment sensor",
							255: "Emergency controlled",
						},
					},
					{},
					product.getLimitationOriginatorMin(parameter),
				);

				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}OriginatorMax`,
					{
						name: `limitation${ParameterActive[parameter]}OriginatorMax`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						max: 255,
						desc: `Origin of the limitation for the max value of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`}`,
						states: {
							1: "User remote control",
							2: "Rain sensor",
							3: "Timer controlled",
							5: "UPS unit",
							8: "Stand alone automatic controls (SAAC)",
							9: "Wind sensor",
							11: "Electric load shed",
							12: "Local light sensor",
							13: "Unspecified environment sensor",
							255: "Emergency controlled",
						},
					},
					{},
					product.getLimitationOriginatorMax(parameter),
				);

				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRaw`,
					{
						name: `limitation${ParameterActive[parameter]}TimeRaw`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						max: 255,
						desc: `DEPRECATED! Use the min/max version of this state: Limitation time raw value of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`}`,
						states: statesLimitationTimeRaw,
					},
					{},
					product.getLimitationTimeRaw(parameter),
				);
				adapter.log.warn(
					`The state products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRaw will be removed in the next major release. Use products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRawMin and products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRawMax instead!` +
						` If you don't use this state in your own scripts, aliases, visualizations or somewhere else you can safely ignore this message. Please don't open any issues regarding this informational message.`,
				);

				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRawMin`,
					{
						name: `limitation${ParameterActive[parameter]}TimeRawMin`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						max: 255,
						desc: `Limitation time raw value for the min value of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`}`,
						states: statesLimitationTimeRaw,
					},
					{},
					product.getLimitationTimeRawMin(parameter),
				);

				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRawMax`,
					{
						name: `limitation${ParameterActive[parameter]}TimeRawMax`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						max: 255,
						desc: `Limitation time raw value for the max value of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`}`,
						states: statesLimitationTimeRaw,
					},
					{},
					product.getLimitationTimeRawMax(parameter),
				);

				let limitationTime = NaN;
				try {
					limitationTime = product.getLimitationTime(parameter) || NaN;
				} catch (error) {
					if (error instanceof Error && error.message === "Lock time value out of range.") {
						limitationTime = NaN;
					}
				}
				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}Time`,
					{
						name: `limitation${ParameterActive[parameter]}Time`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						desc: `DEPRECATED! Use the min/max version of this state: Limitation time of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`} in seconds`,
					},
					{},
					limitationTime,
				);
				adapter.log.warn(
					`The state products.${product.NodeID}.limitation${ParameterActive[parameter]}Time will be removed in the next major release. Use products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeMin and products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeMax instead!` +
						` If you don't use this state in your own scripts, aliases, visualizations or somewhere else you can safely ignore this message. Please don't open any issues regarding this informational message.`,
				);

				let limitationTimeMin = NaN;
				try {
					limitationTimeMin = product.getLimitationTimeMin(parameter) || NaN;
				} catch (error) {
					if (error instanceof Error && error.message === "Lock time value out of range.") {
						limitationTimeMin = NaN;
					}
				}
				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeMin`,
					{
						name: `limitation${ParameterActive[parameter]}TimeMin`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						desc: `Limitation time for the min value of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`} in seconds`,
					},
					{},
					limitationTimeMin,
				);

				let limitationTimeMax = NaN;
				try {
					limitationTimeMax = product.getLimitationTimeMax(parameter) || NaN;
				} catch (error) {
					if (error instanceof Error && error.message === "Lock time value out of range.") {
						limitationTimeMax = NaN;
					}
				}
				await StateHelper.createAndSetStateAsync(
					adapter,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeMax`,
					{
						name: `limitation${ParameterActive[parameter]}TimeMax`,
						role: "value",
						type: "number",
						read: true,
						write: false,
						min: 0,
						desc: `Limitation time for the max value of ${parameter === ParameterActive.MP ? "main parameter" : `functional parameter ${parameter.valueOf()}`} in seconds`,
					},
					{},
					limitationTimeMax,
				);
			} else {
				// Eventually remove objects:
				for (const state of [
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}MinRaw`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}MaxRaw`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}Min`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}Max`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}Originator`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}OriginatorMin`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}OriginatorMax`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRaw`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRawMin`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRawMax`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}Time`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeMin`,
					`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeMax`,
				]) {
					await adapter.delObjectAsync(state);
				}
			}
		}

		await StateHelper.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.refreshLimitation`,
			{
				name: "refresLimitation",
				role: "button.play",
				type: "boolean",
				read: false,
				write: true,
				desc: "Set to true to re-read the limitations of the product from the KLF-200",
			},
			{},
			false,
		);

		// Setup product listener
		adapter.log.debug(`Setup change event listeners for product ${product.Name}.`);
		disposalMap.set(
			`products.${product.NodeID}.property.name`,
			new ComplexPropertyChangedHandler(adapter, "Name", product, async newValue => {
				await adapter.extendObject(`products.${product.NodeID}`, {
					common: {
						name: newValue,
					},
				});
			}),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.nodeVariation`,
			new SimplePropertyChangedHandler(
				adapter,
				`products.${product.NodeID}.nodeVariation`,
				"NodeVariation",
				product,
			),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.order`,
			new SimplePropertyChangedHandler(adapter, `products.${product.NodeID}.order`, "Order", product),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.placement`,
			new SimplePropertyChangedHandler(adapter, `products.${product.NodeID}.placement`, "Placement", product),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.state`,
			new SimplePropertyChangedHandler(adapter, `products.${product.NodeID}.state`, "State", product),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.currentPositionRaw`,
			new SimplePropertyChangedHandler(
				adapter,
				`products.${product.NodeID}.currentPositionRaw`,
				"CurrentPositionRaw",
				product,
			),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.currentPosition`,
			new PercentagePropertyChangedHandler(
				adapter,
				`products.${product.NodeID}.currentPosition`,
				"CurrentPosition",
				product,
			),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.targetPositionRaw`,
			new SimplePropertyChangedHandler(
				adapter,
				`products.${product.NodeID}.targetPositionRaw`,
				"TargetPositionRaw",
				product,
			),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.targetPosition`,
			new PercentagePropertyChangedHandler(
				adapter,
				`products.${product.NodeID}.targetPosition`,
				"TargetPosition",
				product,
			),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.FP1CurrentPositionRaw`,
			new SimplePropertyChangedHandler(
				adapter,
				`products.${product.NodeID}.FP1CurrentPositionRaw`,
				"FP1CurrentPositionRaw",
				product,
			),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.FP2CurrentPositionRaw`,
			new SimplePropertyChangedHandler(
				adapter,
				`products.${product.NodeID}.FP2CurrentPositionRaw`,
				"FP2CurrentPositionRaw",
				product,
			),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.FP3CurrentPositionRaw`,
			new SimplePropertyChangedHandler(
				adapter,
				`products.${product.NodeID}.FP3CurrentPositionRaw`,
				"FP3CurrentPositionRaw",
				product,
			),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.FP4CurrentPositionRaw`,
			new SimplePropertyChangedHandler(
				adapter,
				`products.${product.NodeID}.FP4CurrentPositionRaw`,
				"FP4CurrentPositionRaw",
				product,
			),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.remainingTime`,
			new SimplePropertyChangedHandler(
				adapter,
				`products.${product.NodeID}.remainingTime`,
				"RemainingTime",
				product,
			),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.timestamp`,
			new SimplePropertyChangedHandler(adapter, `products.${product.NodeID}.timestamp`, "TimeStamp", product),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.runStatus`,
			new SimplePropertyChangedHandler(adapter, `products.${product.NodeID}.runStatus`, "RunStatus", product),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.statusReply`,
			new SimplePropertyChangedHandler(adapter, `products.${product.NodeID}.statusReply`, "StatusReply", product),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.limitationMinRaw`,
			new ComplexPropertyChangedHandler(adapter, "LimitationMinRaw", product, async _newValue => {
				for (const parameter of [
					ParameterActive.MP,
					ParameterActive.FP1,
					ParameterActive.FP2,
					ParameterActive.FP3,
					ParameterActive.FP4,
				]) {
					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}MinRaw`,
						product.getLimitationMinRaw(parameter),
						true,
					);
					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}Min`,
						Math.round(product.getLimitationMin(parameter) * 100),
						true,
					);
				}
			}),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.limitationMaxRaw`,
			new ComplexPropertyChangedHandler(adapter, "LimitationMaxRaw", product, async _newValue => {
				for (const parameter of [
					ParameterActive.MP,
					ParameterActive.FP1,
					ParameterActive.FP2,
					ParameterActive.FP3,
					ParameterActive.FP4,
				]) {
					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}MaxRaw`,
						product.getLimitationMaxRaw(parameter),
						true,
					);
					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}Max`,
						Math.round(product.getLimitationMax(parameter) * 100),
						true,
					);
				}
			}),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.limitationOriginator`,
			new ComplexPropertyChangedHandler(adapter, "LimitationOriginator", product, async _newValue => {
				for (const parameter of [
					ParameterActive.MP,
					ParameterActive.FP1,
					ParameterActive.FP2,
					ParameterActive.FP3,
					ParameterActive.FP4,
				]) {
					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}Originator`,
						product.getLimitationOriginator(parameter),
						true,
					);
				}
			}),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.limitationOriginatorMin`,
			new ComplexPropertyChangedHandler(adapter, "LimitationOriginatorMin", product, async _newValue => {
				for (const parameter of [
					ParameterActive.MP,
					ParameterActive.FP1,
					ParameterActive.FP2,
					ParameterActive.FP3,
					ParameterActive.FP4,
				]) {
					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}OriginatorMin`,
						product.getLimitationOriginatorMin(parameter),
						true,
					);
				}
			}),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.limitationOriginatorMax`,
			new ComplexPropertyChangedHandler(adapter, "LimitationOriginatorMax", product, async _newValue => {
				for (const parameter of [
					ParameterActive.MP,
					ParameterActive.FP1,
					ParameterActive.FP2,
					ParameterActive.FP3,
					ParameterActive.FP4,
				]) {
					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}OriginatorMax`,
						product.getLimitationOriginatorMax(parameter),
						true,
					);
				}
			}),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.limitationTimeRaw`,
			new ComplexPropertyChangedHandler(adapter, "LimitationTimeRaw", product, async _newValue => {
				for (const parameter of [
					ParameterActive.MP,
					ParameterActive.FP1,
					ParameterActive.FP2,
					ParameterActive.FP3,
					ParameterActive.FP4,
				]) {
					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRaw`,
						product.getLimitationTimeRaw(parameter),
						true,
					);

					let limitationTime = NaN;
					try {
						limitationTime = Math.round((product.getLimitationTime(parameter) || NaN) * 100);
					} catch (error) {
						if (error instanceof Error && error.message === "Lock time value out of range.") {
							limitationTime = NaN;
						}
					}

					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}Time`,
						limitationTime,
						true,
					);
				}
			}),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.limitationTimeRawMin`,
			new ComplexPropertyChangedHandler(adapter, "LimitationTimeRawMin", product, async _newValue => {
				for (const parameter of [
					ParameterActive.MP,
					ParameterActive.FP1,
					ParameterActive.FP2,
					ParameterActive.FP3,
					ParameterActive.FP4,
				]) {
					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRawMin`,
						product.getLimitationTimeRawMin(parameter),
						true,
					);

					let limitationTimeMin = NaN;
					try {
						limitationTimeMin = Math.round((product.getLimitationTimeMin(parameter) || NaN) * 100);
					} catch (error) {
						if (error instanceof Error && error.message === "Lock time value out of range.") {
							limitationTimeMin = NaN;
						}
					}

					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeMin`,
						limitationTimeMin,
						true,
					);
				}
			}),
		);

		disposalMap.set(
			`products.${product.NodeID}.property.limitationTimeRawMax`,
			new ComplexPropertyChangedHandler(adapter, "LimitationTimeRawMax", product, async _newValue => {
				for (const parameter of [
					ParameterActive.MP,
					ParameterActive.FP1,
					ParameterActive.FP2,
					ParameterActive.FP3,
					ParameterActive.FP4,
				]) {
					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeRawMax`,
						product.getLimitationTimeRawMax(parameter),
						true,
					);

					let limitationTimeMax = NaN;
					try {
						limitationTimeMax = Math.round((product.getLimitationTimeMax(parameter) || NaN) * 100);
					} catch (error) {
						if (error instanceof Error && error.message === "Lock time value out of range.") {
							limitationTimeMax = NaN;
						}
					}

					await adapter.setStateChangedAsync(
						`products.${product.NodeID}.limitation${ParameterActive[parameter]}TimeMax`,
						limitationTimeMax,
						true,
					);
				}
			}),
		);

		adapter.log.debug(`Setup state change listeners for product ${product.Name}.`);
		const nodeVariationStateId = `products.${product.NodeID}.nodeVariation`;
		const nodeVariationHandler = new SimpleStateChangeHandler<Product>(
			adapter,
			nodeVariationStateId,
			"NodeVariation",
			product,
		);
		await nodeVariationHandler.Initialize();
		disposalMap.set(nodeVariationStateId, nodeVariationHandler);

		const orderStateId = `products.${product.NodeID}.order`;
		const orderHandler = new SimpleStateChangeHandler<Product>(adapter, orderStateId, "Order", product);
		await orderHandler.Initialize();
		disposalMap.set(orderStateId, orderHandler);

		const placementStateId = `products.${product.NodeID}.placement`;
		const placementHandler = new SimpleStateChangeHandler<Product>(adapter, placementStateId, "Placement", product);
		await placementHandler.Initialize();
		disposalMap.set(placementStateId, placementHandler);

		const targetPositionStateId = `products.${product.NodeID}.targetPosition`;
		const targetPositionHandler = new ComplexStateChangeHandler(adapter, targetPositionStateId, async state => {
			if (state !== undefined && state?.val !== undefined) {
				/*
						Read the states of targetFP1Raw - targetFP4Raw.
						For each state which is not set to Ignore (0xD400)
						add the value to the functional parameter.
					*/
				let functionalParameters: FunctionalParameter[] | undefined = undefined;
				for (const parameterCounter of [1, 2, 3, 4]) {
					const stateFP = await adapter.getStateAsync(
						`products.${product.NodeID}.targetFP${parameterCounter}Raw`,
					);
					if (stateFP?.val !== undefined && stateFP.val !== 0xd400) {
						functionalParameters = functionalParameters || [];
						functionalParameters.push({
							ID: parameterCounter,
							Value: stateFP.val as number,
						});
					}
				}
				await product.setTargetPositionAsync(
					(state.val as number) / 100,
					undefined,
					undefined,
					undefined,
					functionalParameters,
				);
			}
		});
		await targetPositionHandler.Initialize();
		disposalMap.set(targetPositionStateId, targetPositionHandler);

		const targetPositionRawStateId = `products.${product.NodeID}.targetPositionRaw`;
		const targetPositionRawHandler = new ComplexStateChangeHandler(
			adapter,
			targetPositionRawStateId,
			async state => {
				if (state !== undefined && state?.val !== undefined) {
					/*
						Read the states of targetFP1Raw - targetFP4Raw.
						For each state which is not set to Ignore (0xD400)
						add the value to the functional parameter.
					*/
					let functionalParameters: FunctionalParameter[] | undefined = undefined;
					for (const parameterCounter of [1, 2, 3, 4]) {
						const stateFP = await adapter.getStateAsync(
							`products.${product.NodeID}.targetFP${parameterCounter}Raw`,
						);
						if (stateFP?.val !== undefined && stateFP.val !== 0xd400) {
							functionalParameters = functionalParameters || [];
							functionalParameters.push({
								ID: parameterCounter,
								Value: stateFP.val as number,
							});
						}
					}
					await product.setTargetPositionRawAsync(
						state.val as number,
						undefined,
						undefined,
						undefined,
						functionalParameters,
					);
				}
			},
		);
		await targetPositionRawHandler.Initialize();
		disposalMap.set(targetPositionRawStateId, targetPositionRawHandler);

		const stopStateId = `products.${product.NodeID}.stop`;
		const stopListener = new ComplexStateChangeHandler(adapter, stopStateId, async state => {
			if (state !== undefined) {
				if (state?.val === true) {
					// Acknowledge stop state first
					await adapter.setState(`products.${product.NodeID}.stop`, state, true);
					await product.stopAsync();
					await adapter.setState(`products.${product.NodeID}.stop`, false, true);
				}
			}
		});
		await stopListener.Initialize();
		disposalMap.set(stopStateId, stopListener);

		const winkStateId = `products.${product.NodeID}.wink`;
		const winkListener = new ComplexStateChangeHandler(adapter, winkStateId, async state => {
			if (state !== undefined) {
				if (state?.val === true) {
					// Acknowledge wink state first
					await adapter.setState(`products.${product.NodeID}.wink`, state, true);
					await product.winkAsync();
					await adapter.setState(`products.${product.NodeID}.wink`, false, true);
				}
			}
		});
		await winkListener.Initialize();
		disposalMap.set(winkStateId, winkListener);

		for (const parameterCounter of [1, 2, 3, 4]) {
			const targetFPRawStateId = `products.${product.NodeID}.targetFP${parameterCounter}Raw`;
			const targetFPRawHandler = new EchoStateChangeHandler(adapter, targetFPRawStateId);
			await targetFPRawHandler.Initialize();
			disposalMap.set(targetFPRawStateId, targetFPRawHandler);
		}

		const refreshProductStateId = `products.${product.NodeID}.refreshProduct`;
		const refreshProductListener = new ComplexStateChangeHandler(adapter, refreshProductStateId, async state => {
			if (state !== undefined) {
				if (state?.val === true) {
					// Acknowledge refreshProduct state first
					await adapter.setState(refreshProductStateId, state, true);
					const sessionId = await ((adapter as HasProductsInterface).Products as Products).requestStatusAsync(
						product.NodeID,
						StatusType.RequestCurrentPosition,
						[1, 2, 3, 4],
					);
					try {
						await waitForSessionFinishedNtfAsync(
							adapter,
							(adapter as HasConnectionInterface).Connection as IConnection,
							sessionId,
						);
					} catch (e) {
						if (e != "TimeoutError") {
							throw e;
						}
					}
					await adapter.setState(refreshProductStateId, false, true);
				}
			}
		});
		await refreshProductListener.Initialize();
		disposalMap.set(refreshProductStateId, refreshProductListener);

		const refreshLimitationStateId = `products.${product.NodeID}.refreshLimitation`;
		const refreshLimitationListener = new ComplexStateChangeHandler(
			adapter,
			refreshLimitationStateId,
			async state => {
				if (state !== undefined) {
					if (state?.val === true) {
						// Acknowledge refreshLimitation state first
						await adapter.setState(refreshLimitationStateId, state, true);

						// Get a list of defined parameters:
						const parameters: ParameterActive[] = [];
						for (const [key, value] of [
							[ParameterActive.MP, "limitationMPMaxRaw"],
							[ParameterActive.FP1, "limitationFP1MaxRaw"],
							[ParameterActive.FP2, "limitationFP2MaxRaw"],
							[ParameterActive.FP3, "limitationFP3MaxRaw"],
							[ParameterActive.FP4, "limitationFP4MaxRaw"],
						] as const) {
							const existingState = await adapter.objectExists(`products.${product.NodeID}.${value}`);
							if (existingState) {
								parameters.push(key);
							}
						}

						for (const parameter of parameters) {
							for (const limitationType of [
								LimitationType.MinimumLimitation,
								LimitationType.MaximumLimitation,
							]) {
								await product.refreshLimitationAsync(limitationType, parameter);
							}
						}
						await adapter.setState(refreshLimitationStateId, false, true);
					}
				}
			},
		);
		await refreshLimitationListener.Initialize();
		disposalMap.set(refreshLimitationStateId, refreshLimitationListener);
	}
}
