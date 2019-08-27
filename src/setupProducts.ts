"use strict";

import { Product } from "klf-200-api";
import { levelConverter, roleConverter } from "./util/converter";

export class setupProducts {
	public static async createProductAsync(adapter: ioBroker.Adapter, product: Product) {
		await adapter.setObjectNotExistsAsync(`products.${product.NodeID}`, {
			type: "channel",
			common: {
				name: product.Name,
				role: roleConverter.convert(product.TypeID),
			},
			native: product,
		});

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
			adapter,
			`products.${product.NodeID}.level`,
			{
				name: "level",
				role: levelConverter.convert(product.TypeID),
				type: "number",
				read: true,
				write: true,
				min: 0,
				max: 100,
				unit: "%",
				desc: "Opening level in percent",
			},
			{},
			product.CurrentPosition * 100,
		);

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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
			},
			{},
			product.NodeVariation,
		);

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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
			},
			{},
			product.PowerSaveMode,
		);

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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
			},
			{},
			product.RunStatus,
		);

		await this.createAndSetStateAsync(
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
			`${product.SerialNumber.toString("hex")
				.replace(/(..)/g, ":$1")
				.slice(1)}`,
		);

		await this.createAndSetStateAsync(
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
			},
			{},
			product.State,
		);

		await this.createAndSetStateAsync(
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
			},
			{},
			product.StatusReply,
		);

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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
			},
			{},
			product.TargetPositionRaw,
		);

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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
			},
			{},
			product.TypeID,
		);

		await this.createAndSetStateAsync(
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
			},
			{},
			product.Velocity,
		);

		await this.createAndSetStateAsync(
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

		await this.createAndSetStateAsync(
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
	}

	private static async createAndSetStateAsync(
		adapter: ioBroker.Adapter,
		stateID: string,
		common: ioBroker.StateCommon,
		native: Record<string, any>,
		value: string | number | boolean | ioBroker.State | Partial<ioBroker.State>,
	): Promise<void> {
		await adapter.setObjectNotExistsAsync(stateID, {
			type: "state",
			common: common,
			native: native,
		});
		await adapter.setStateAsync(stateID, value, true);
	}
}
