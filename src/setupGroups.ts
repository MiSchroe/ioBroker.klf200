"use strict";

import { type Group, GroupType, type Product } from "klf-200-api";
import type { DisposalMap } from "./disposalMap.js";
import { levelConverter, roleGroupTypeConverter } from "./util/converter.js";
import {
	ComplexPropertyChangedHandler,
	PercentageStateChangeHandler,
	SetterStateChangeHandler,
	SimplePropertyChangedHandler,
	SimpleStateChangeHandler,
} from "./util/propertyLink.js";
import { StateHelper } from "./util/stateHelper.js";
import { ArrayCount } from "./util/utils.js";

/**
 * Class to setup groups
 */
export class SetupGroups {
	/**
	 * Create all groups with their properties and states.
	 *
	 * The function also removes all groups that are no longer present in the `groups` array.
	 *
	 * @param adapter - The ioBroker adapter instance.
	 * @param groups - The list of groups to create.
	 * @param products - The list of products to link to the groups.
	 * @param disposalMap - A map of disposables to clean up.
	 */
	public static async createGroupsAsync(
		adapter: ioBroker.Adapter,
		groups: Group[],
		products: Product[],
		disposalMap: DisposalMap,
	): Promise<void> {
		// Remove old groups
		const currentGroupsList = await adapter.getChannelsOfAsync(`groups`);
		adapter.log.debug(`Current Groups List: ${JSON.stringify(currentGroupsList)}`);
		// Filter current channels to contain only those, that are not present in the provided groups list
		const channelsToRemove = currentGroupsList.filter(
			channel =>
				!groups.some(group => {
					return group && group.GroupID === Number.parseInt(channel._id.split(".").reverse()[0]);
				}),
		);
		// Delete channels
		for (const channel of channelsToRemove) {
			const channelId = channel._id.split(".").reverse()[0];
			const groupId = `groups.${channelId}`;
			await disposalMap.disposeId(groupId);
			await adapter.delObjectAsync(groupId, { recursive: true });
		}
		if (channelsToRemove.length !== 0) {
			adapter.log.info(`${channelsToRemove.length} unknown groups removed.`);
		}

		for (const group of groups) {
			if (group) {
				await SetupGroups.createGroupAsync(adapter, group, products, disposalMap);
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
	}

	/**
	 * Creates all objects and states for a single group.
	 *
	 * @param adapter - The ioBroker adapter instance.
	 * @param group - The group to create objects and states for.
	 * @param products - The list of products to link to the group.
	 * @param disposalMap - A map of disposables to clean up.
	 */
	public static async createGroupAsync(
		adapter: ioBroker.Adapter,
		group: Group,
		products: Product[],
		disposalMap: DisposalMap,
	): Promise<void> {
		adapter.log.info(`Setup objects for group ${group.Name}.`);

		await adapter.extendObject(`groups.${group.GroupID}`, {
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
					0: "UserGroup",
					1: "Room",
					2: "House",
					3: "All",
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
					0: "NotSet",
					1: "TopHung",
					2: "Kip",
					3: "FlatRoof",
					4: "SkyLight",
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
					0: "Default",
					1: "Silent",
					2: "Fast",
					255: "NotAvailable",
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
		disposalMap.set(
			`groups.${group.GroupID}.property.nodeVariation`,
			new SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.nodeVariation`, "NodeVariation", group),
		);

		disposalMap.set(
			`groups.${group.GroupID}.property.order`,
			new SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.order`, "Order", group),
		);
		disposalMap.set(
			`groups.${group.GroupID}.property.placement`,
			new SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.placement`, "Placement", group),
		);
		disposalMap.set(
			`groups.${group.GroupID}.property.velocity`,
			new SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.velocity`, "Velocity", group),
		);
		disposalMap.set(
			`groups.${group.GroupID}.property.groupType`,
			new SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.groupType`, "GroupType", group),
		);
		disposalMap.set(
			`groups.${group.GroupID}.property.Nodes`,
			new ComplexPropertyChangedHandler(adapter, "Nodes", group, async newValue => {
				await adapter.setStateChangedAsync(`groups.${group.GroupID}.productsCount`, ArrayCount(newValue), true);
			}),
		);

		// Setup state listeners
		const nodeVariationStateId = `groups.${group.GroupID}.nodeVariation`;
		const nodeVariationHandler = new SimpleStateChangeHandler<Group>(
			adapter,
			nodeVariationStateId,
			"NodeVariation",
			group,
		);
		await nodeVariationHandler.Initialize();
		disposalMap.set(nodeVariationStateId, nodeVariationHandler);

		const orderStateId = `groups.${group.GroupID}.order`;
		const orderHandler = new SimpleStateChangeHandler<Group>(adapter, orderStateId, "Order", group);
		await orderHandler.Initialize();
		disposalMap.set(orderStateId, orderHandler);

		const placementStateId = `groups.${group.GroupID}.placement`;
		const placementHandler = new SimpleStateChangeHandler<Group>(adapter, placementStateId, "Placement", group);
		await placementHandler.Initialize();
		disposalMap.set(placementStateId, placementHandler);

		const targetPositionStateId = `groups.${group.GroupID}.targetPosition`;
		const targetPositionHandler = new PercentageStateChangeHandler<Group>(
			adapter,
			targetPositionStateId,
			group,
			"setTargetPositionAsync",
		);
		await targetPositionHandler.Initialize();
		disposalMap.set(targetPositionStateId, targetPositionHandler);

		const targetPositionRawStateId = `groups.${group.GroupID}.targetPositionRaw`;
		const targetPositionRawHandler = new SetterStateChangeHandler<Group>(
			adapter,
			targetPositionRawStateId,
			group,
			"setTargetPositionRawAsync",
		);
		await targetPositionRawHandler.Initialize();
		disposalMap.set(targetPositionRawStateId, targetPositionRawHandler);

		const velocityStateId = `groups.${group.GroupID}.velocity`;
		const velocityHandler = new SimpleStateChangeHandler<Group>(adapter, velocityStateId, "Velocity", group);
		await velocityHandler.Initialize();
		disposalMap.set(velocityStateId, velocityHandler);
	}
}
