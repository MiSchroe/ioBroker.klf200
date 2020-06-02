"use strict";

import { Group, GroupType, Product } from "klf-200-api";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";
import { levelConverter, roleGroupTypeConverter } from "./util/converter";
import {
	ComplexPropertyChangedHandler,
	PercentageStateChangeHandler,
	SetterStateChangeHandler,
	SimplePropertyChangedHandler,
	SimpleStateChangeHandler,
} from "./util/propertyLink";
import { StateHelper } from "./util/stateHelper";
import { ArrayCount } from "./util/utils";

const mapPropertyToState = {
	NodeVariation: "nodeVariation",
	Order: "order",
	Placement: "placement",
	GroupType: "groupType",
	Velocity: "velocity",
};

export class SetupGroups {
	public static async createGroupsAsync(
		adapter: ioBroker.Adapter,
		groups: Group[],
		products: Product[],
	): Promise<Disposable[]> {
		const disposableEvents: Disposable[] = [];

		for (const group of groups) {
			if (group) {
				disposableEvents.push(...(await this.createGroupAsync(adapter, group, products)));
			}
		}

		// Write number of products
		await StateHelper.createAndSetStateAsync(
			adapter,
			`groups.groupsFound`,
			{
				name: "Number of groups found",
				role: "value",
				type: "number",
				read: true,
				write: false,
				min: 0,
				def: 0,
				desc: "Number of groups defined in the interface",
			},
			{},
			ArrayCount(groups),
		);

		return disposableEvents;
	}

	public static async createGroupAsync(
		adapter: ioBroker.Adapter,
		group: Group,
		products: Product[],
	): Promise<Disposable[]> {
		const disposableEvents: Disposable[] = [];

		await adapter.setObjectNotExistsAsync(`groups.${group.GroupID}`, {
			type: "channel",
			common: {
				name: group.Name,
				role: roleGroupTypeConverter.convert(group.GroupType),
			},
			native: {},
		});

		await StateHelper.createAndSetStateAsync(
			adapter,
			`groups.${group.GroupID}.groupType`,
			{
				name: "groupType",
				role: roleGroupTypeConverter.convert(group.GroupType),
				type: "number",
				read: true,
				write: false,
				desc: `Type of the registered group (${GroupType.House} = house, ${GroupType.Room} = room or ${GroupType.UserGroup} = user defined group)`,
				states: {
					"0": "UserGroup",
					"1": "Room",
					"2": "House",
					"3": "All",
				},
			},
			{},
			group.GroupType,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`groups.${group.GroupID}.productsCount`,
			{
				name: "productsCount",
				role: "value",
				type: "number",
				read: true,
				write: false,
				desc: `Number of products that are contained in the group.`,
			},
			{},
			ArrayCount(group.Nodes),
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`groups.${group.GroupID}.nodeVariation`,
			{
				name: "nodeVariation",
				role: "value",
				type: "number",
				read: true,
				write: true,
				min: 0,
				max: 0xff,
				desc: `Variation of the group.`,
				states: {
					"0": "NotSet",
					"1": "TopHung",
					"2": "Kip",
					"3": "FlatRoof",
					"4": "SkyLight",
				},
			},
			{},
			group.NodeVariation,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`groups.${group.GroupID}.order`,
			{
				name: "order",
				role: "value",
				type: "number",
				read: true,
				write: true,
				min: 0,
				max: 0xffff,
				desc: "Custom order of groups",
			},
			{},
			group.Order,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`groups.${group.GroupID}.placement`,
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
			group.Placement,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`groups.${group.GroupID}.velocity`,
			{
				name: "velocity",
				role: "value",
				type: "number",
				read: true,
				write: true,
				min: 0,
				max: 0xff,
				desc: "Velocity of the group",
				states: {
					"0": "Default",
					"1": "Silent",
					"2": "Fast",
					"255": "NotAvailable",
				},
			},
			{},
			group.Velocity,
		);

		/*
            Groups contain products of the same
            product type only. To get the right role
            the first node has to be fetched and
            the role of that product can be used.
        */
		await adapter.setObjectNotExistsAsync(`groups.${group.GroupID}.targetPosition`, {
			type: "state",
			common: {
				name: "targetPosition",
				role: levelConverter.convert(products[group.Nodes[0]].TypeID),
				type: "number",
				read: false,
				write: true,
				min: 0,
				max: 100,
				unit: "%",
				desc: "Level in percent",
			},
			native: {},
		});

		await adapter.setObjectNotExistsAsync(`groups.${group.GroupID}.targetPositionRaw`, {
			type: "state",
			common: {
				name: "targetPositionRaw",
				role: "value",
				type: "number",
				read: false,
				write: true,
				min: 0,
				max: 0xffff,
				desc: "Target position raw value",
			},
			native: {},
		});

		// Setup group listener
		disposableEvents.push(
			new SimplePropertyChangedHandler<Group>(
				adapter,
				`groups.${group.GroupID}.nodeVariation`,
				"NodeVariation",
				group,
			),
			new SimplePropertyChangedHandler<Group>(adapter, `groups.${group.GroupID}.order`, "Order", group),
			new SimplePropertyChangedHandler<Group>(adapter, `groups.${group.GroupID}.placement`, "Placement", group),
			new SimplePropertyChangedHandler<Group>(adapter, `groups.${group.GroupID}.velocity`, "Velocity", group),
			new SimplePropertyChangedHandler<Group>(adapter, `groups.${group.GroupID}.groupType`, "GroupType", group),
			new ComplexPropertyChangedHandler<Group>(adapter, "Nodes", group, async (newValue) => {
				return await adapter.setStateChangedAsync(
					`groups.${group.GroupID}.productsCount`,
					ArrayCount(newValue as number[]),
					true,
				);
			}),
		);

		const nodeVariationHandler = new SimpleStateChangeHandler<Group>(
			adapter,
			`groups.${group.GroupID}.nodeVariation`,
			"NodeVariation",
			group,
		);
		await nodeVariationHandler.Initialize();
		disposableEvents.push(nodeVariationHandler);

		const orderHandler = new SimpleStateChangeHandler<Group>(
			adapter,
			`groups.${group.GroupID}.order`,
			"Order",
			group,
		);
		await orderHandler.Initialize();
		disposableEvents.push(orderHandler);

		const placementHandler = new SimpleStateChangeHandler<Group>(
			adapter,
			`groups.${group.GroupID}.placement`,
			"Placement",
			group,
		);
		await placementHandler.Initialize();
		disposableEvents.push(placementHandler);

		const targetPositionHandler = new PercentageStateChangeHandler<Group>(
			adapter,
			`groups.${group.GroupID}.targetPosition`,
			group,
			"setTargetPositionAsync",
		);
		await targetPositionHandler.Initialize();
		disposableEvents.push(targetPositionHandler);

		const targetPositionRawHandler = new SetterStateChangeHandler<Group>(
			adapter,
			`groups.${group.GroupID}.targetPositionRaw`,
			group,
			"setTargetPositionRawAsync",
		);
		await targetPositionRawHandler.Initialize();
		disposableEvents.push(targetPositionRawHandler);

		const velocityHandler = new SimpleStateChangeHandler<Group>(
			adapter,
			`groups.${group.GroupID}.velocity`,
			"Velocity",
			group,
		);
		await velocityHandler.Initialize();
		disposableEvents.push(velocityHandler);

		return disposableEvents;
	}
}
