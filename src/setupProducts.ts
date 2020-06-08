"use strict";

import { Product } from "klf-200-api";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";
import { levelConverter, roleConverter } from "./util/converter";
import {
	ComplexStateChangeHandler,
	PercentagePropertyChangedHandler,
	PercentageStateChangeHandler,
	SimplePropertyChangedHandler,
	SimpleStateChangeHandler,
} from "./util/propertyLink";
import { StateHelper } from "./util/stateHelper";
import { ArrayCount } from "./util/utils";

export class SetupProducts {
	public static async createProductsAsync(adapter: ioBroker.Adapter, products: Product[]): Promise<Disposable[]> {
		const disposableEvents: Disposable[] = [];

		// Remove old products
		const currentProductList = await adapter.getChannelsOfAsync(`products`);
		adapter.log.debug(`Current Product List: ${JSON.stringify(currentProductList)}`);
		// Filter current channels to contain only those, that are not present in the provided products list
		const channelsToRemove = currentProductList.filter(
			(channel) =>
				!products.some((product) => {
					return product.NodeID === Number.parseInt(channel._id.split(".").reverse()[0]);
				}),
		);
		// Delete channels
		for (const channel of channelsToRemove) {
			await adapter.deleteChannelAsync(`products`, channel._id);
		}
		if (channelsToRemove.length !== 0) {
			adapter.log.info(`${channelsToRemove.length} unknown products removed.`);
		}

		for (const product of products) {
			if (product) {
				disposableEvents.push(...(await this.createProductAsync(adapter, product)));
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

		return disposableEvents;
	}

	public static async createProductAsync(adapter: ioBroker.Adapter, product: Product): Promise<Disposable[]> {
		const disposableEvents: Disposable[] = [];

		adapter.log.info(`Setup objects for product ${product.Name}.`);

		await adapter.setObjectNotExistsAsync(`products.${product.NodeID}`, {
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
					"0": "NotSet",
					"1": "TopHung",
					"2": "Kip",
					"3": "FlatRoof",
					"4": "SkyLight",
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
					"0": "AlwaysAlive",
					"1": "LowPowerMode",
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
					"0": "ExecutionCompleted",
					"1": "ExecutionFailed",
					"2": "ExecutionActive",
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
					"0": "NonExecuting",
					"1": "Error",
					"2": "NotUsed",
					"3": "WaitingForPower",
					"4": "Executing",
					"5": "Done",
					"255": "Unknown",
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
					"0": "Unknown",
					"1": "Ok",
					"2": "NoContact",
					"3": "ManuallyOperated",
					"4": "Blocked",
					"5": "WrongSystemKey",
					"6": "PriorityLevelLocked",
					"7": "ReachedWrongPosition",
					"8": "ErrorDuringExecution",
					"9": "NoExecution",
					"10": "Calibrating",
					"11": "PowerConsumptionTooHigh",
					"12": "PowerConsumptionTooLow",
					"13": "LockPositionOpen",
					"14": "MotionTimeTooLongCommunicationEnded",
					"15": "ThermalProtection",
					"16": "ProductNotOperational",
					"17": "FilterMaintenanceNeeded",
					"18": "BatteryLevel",
					"19": "TargetModified",
					"20": "ModeNotImplemented",
					"21": "CommandIncompatibleToMovement",
					"22": "UserAction",
					"23": "DeadBoltError",
					"24": "AutomaticCycleEngaged",
					"25": "WrongLoadConnected",
					"26": "ColourNotReachable",
					"27": "TargetNotReachable",
					"28": "BadIndexReceived",
					"29": "CommandOverruled",
					"30": "NodeWaitingForPower",
					"223": "InformationCode",
					"224": "ParameterLimited",
					"225": "LimitationByLocalUser",
					"226": "LimitationByUser",
					"227": "LimitationByRain",
					"228": "LimitationByTimer",
					"230": "LimitationByUps",
					"231": "LimitationByUnknownDevice",
					"234": "LimitationBySAAC",
					"235": "LimitationByWind",
					"236": "LimitationByMyself",
					"237": "LimitationByAutomaticCycle",
					"238": "LimitationByEmergency",
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
				desc:
					"Target opening level in percent. Set this value to move the product to that value, e.g. open a window, move a roller shutter.",
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
				write: false,
				min: 0,
				max: 0xffff,
				desc: "Target position raw value",
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
					"0": "NO_TYPE",
					"1": "VenetianBlind",
					"2": "RollerShutter",
					"3": "Awning",
					"4": "WindowOpener",
					"5": "GarageOpener",
					"6": "Light",
					"7": "GateOpener",
					"8": "RollingDoorOpener",
					"9": "Lock",
					"10": "Blind",
					"12": "Beacon",
					"13": "DualShutter",
					"14": "HeatingTemperatureInterface",
					"15": "OnOffSwitch",
					"16": "HorizontalAwning",
					"17": "ExternalVentianBlind",
					"18": "LouvreBlind",
					"19": "CurtainTrack",
					"20": "VentilationPoint",
					"21": "ExteriorHeating",
					"22": "HeatPump",
					"23": "IntrusionAlarm",
					"24": "SwingingShutter",
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
					"0": "Default",
					"1": "Silent",
					"2": "Fast",
					"255": "NotAvailable",
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

		// Setup product listener
		adapter.log.debug(`Setup change event listeners for product ${product.Name}.`);
		disposableEvents.push(
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.nodeVariation`,
				"NodeVariation",
				product,
			),
			new SimplePropertyChangedHandler<Product>(adapter, `products.${product.NodeID}.order`, "Order", product),
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.placement`,
				"Placement",
				product,
			),
			new SimplePropertyChangedHandler<Product>(adapter, `products.${product.NodeID}.state`, "State", product),
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.currentPositionRaw`,
				"CurrentPositionRaw",
				product,
			),
			new PercentagePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.currentPosition`,
				"CurrentPosition",
				product,
			),
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.targetPositionRaw`,
				"TargetPositionRaw",
				product,
			),
			new PercentagePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.targetPosition`,
				"TargetPosition",
				product,
			),
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.FP1CurrentPositionRaw`,
				"FP1CurrentPositionRaw",
				product,
			),
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.FP2CurrentPositionRaw`,
				"FP2CurrentPositionRaw",
				product,
			),
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.FP3CurrentPositionRaw`,
				"FP3CurrentPositionRaw",
				product,
			),
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.FP4CurrentPositionRaw`,
				"FP4CurrentPositionRaw",
				product,
			),
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.remainingTime`,
				"RemainingTime",
				product,
			),
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.timestamp`,
				"TimeStamp",
				product,
			),
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.runStatus`,
				"RunStatus",
				product,
			),
			new SimplePropertyChangedHandler<Product>(
				adapter,
				`products.${product.NodeID}.statusReply`,
				"StatusReply",
				product,
			),
		);

		adapter.log.debug(`Setup state change listeners for product ${product.Name}.`);
		const nodeVariationHandler = new SimpleStateChangeHandler<Product>(
			adapter,
			`products.${product.NodeID}.nodeVariation`,
			"NodeVariation",
			product,
		);
		await nodeVariationHandler.Initialize();
		disposableEvents.push(nodeVariationHandler);

		const orderHandler = new SimpleStateChangeHandler<Product>(
			adapter,
			`products.${product.NodeID}.order`,
			"Order",
			product,
		);
		await orderHandler.Initialize();
		disposableEvents.push(orderHandler);

		const placementHandler = new SimpleStateChangeHandler<Product>(
			adapter,
			`products.${product.NodeID}.placement`,
			"Placement",
			product,
		);
		await placementHandler.Initialize();
		disposableEvents.push(placementHandler);

		const targetPositionHandler = new PercentageStateChangeHandler<Product>(
			adapter,
			`products.${product.NodeID}.targetPosition`,
			product,
			"setTargetPositionAsync",
		);
		await targetPositionHandler.Initialize();
		disposableEvents.push(targetPositionHandler);

		const stopListener = new ComplexStateChangeHandler(
			adapter,
			`products.${product.NodeID}.stop`,
			async (state) => {
				if (state !== undefined) {
					if (state?.val === true) {
						// Acknowledge stop state first
						await adapter.setStateAsync(`products.${product.NodeID}.stop`, state, true);
						await product.stopAsync();
					}
				}
			},
		);
		await stopListener.Initialize();
		disposableEvents.push(stopListener);

		const winkListener = new ComplexStateChangeHandler(
			adapter,
			`products.${product.NodeID}.wink`,
			async (state) => {
				if (state !== undefined) {
					if (state?.val === true) {
						// Acknowledge wink state first
						await adapter.setStateAsync(`products.${product.NodeID}.wink`, state, true);
						await product.winkAsync();
					}
				}
			},
		);
		await winkListener.Initialize();
		disposableEvents.push(winkListener);

		return disposableEvents;
	}
}
