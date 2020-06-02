"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const klf_200_api_1 = require("klf-200-api");
const converter_1 = require("./util/converter");
const propertyLink_1 = require("./util/propertyLink");
const stateHelper_1 = require("./util/stateHelper");
const utils_1 = require("./util/utils");
const mapPropertyToState = {
    NodeVariation: "nodeVariation",
    Order: "order",
    Placement: "placement",
    GroupType: "groupType",
    Velocity: "velocity",
};
class SetupGroups {
    static async createGroupsAsync(adapter, groups, products) {
        const disposableEvents = [];
        for (const group of groups) {
            if (group) {
                disposableEvents.push(...(await this.createGroupAsync(adapter, group, products)));
            }
        }
        // Write number of products
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `groups.groupsFound`, {
            name: "Number of groups found",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            def: 0,
            desc: "Number of groups defined in the interface",
        }, {}, utils_1.ArrayCount(groups));
        return disposableEvents;
    }
    static async createGroupAsync(adapter, group, products) {
        const disposableEvents = [];
        await adapter.setObjectNotExistsAsync(`groups.${group.GroupID}`, {
            type: "channel",
            common: {
                name: group.Name,
                role: converter_1.roleGroupTypeConverter.convert(group.GroupType),
            },
            native: {},
        });
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `groups.${group.GroupID}.groupType`, {
            name: "groupType",
            role: converter_1.roleGroupTypeConverter.convert(group.GroupType),
            type: "number",
            read: true,
            write: false,
            desc: `Type of the registered group (${klf_200_api_1.GroupType.House} = house, ${klf_200_api_1.GroupType.Room} = room or ${klf_200_api_1.GroupType.UserGroup} = user defined group)`,
            states: {
                "0": "UserGroup",
                "1": "Room",
                "2": "House",
                "3": "All",
            },
        }, {}, group.GroupType);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `groups.${group.GroupID}.productsCount`, {
            name: "productsCount",
            role: "value",
            type: "number",
            read: true,
            write: false,
            desc: `Number of products that are contained in the group.`,
        }, {}, utils_1.ArrayCount(group.Nodes));
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `groups.${group.GroupID}.nodeVariation`, {
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
        }, {}, group.NodeVariation);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `groups.${group.GroupID}.order`, {
            name: "order",
            role: "value",
            type: "number",
            read: true,
            write: true,
            min: 0,
            max: 0xffff,
            desc: "Custom order of groups",
        }, {}, group.Order);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `groups.${group.GroupID}.placement`, {
            name: "placement",
            role: "value",
            type: "number",
            read: true,
            write: true,
            min: 0,
            max: 0xff,
            desc: "Placement (house = 0 or room number)",
        }, {}, group.Placement);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `groups.${group.GroupID}.velocity`, {
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
        }, {}, group.Velocity);
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
                role: converter_1.levelConverter.convert(products[group.Nodes[0]].TypeID),
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
        disposableEvents.push(new propertyLink_1.SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.nodeVariation`, "NodeVariation", group), new propertyLink_1.SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.order`, "Order", group), new propertyLink_1.SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.placement`, "Placement", group), new propertyLink_1.SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.velocity`, "Velocity", group), new propertyLink_1.SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.groupType`, "GroupType", group), new propertyLink_1.ComplexPropertyChangedHandler(adapter, "Nodes", group, async (newValue) => {
            return await adapter.setStateChangedAsync(`groups.${group.GroupID}.productsCount`, utils_1.ArrayCount(newValue), true);
        }));
        const nodeVariationHandler = new propertyLink_1.SimpleStateChangeHandler(adapter, `groups.${group.GroupID}.nodeVariation`, "NodeVariation", group);
        await nodeVariationHandler.Initialize();
        disposableEvents.push(nodeVariationHandler);
        const orderHandler = new propertyLink_1.SimpleStateChangeHandler(adapter, `groups.${group.GroupID}.order`, "Order", group);
        await orderHandler.Initialize();
        disposableEvents.push(orderHandler);
        const placementHandler = new propertyLink_1.SimpleStateChangeHandler(adapter, `groups.${group.GroupID}.placement`, "Placement", group);
        await placementHandler.Initialize();
        disposableEvents.push(placementHandler);
        const targetPositionHandler = new propertyLink_1.PercentageStateChangeHandler(adapter, `groups.${group.GroupID}.targetPosition`, group, "setTargetPositionAsync");
        await targetPositionHandler.Initialize();
        disposableEvents.push(targetPositionHandler);
        const targetPositionRawHandler = new propertyLink_1.SetterStateChangeHandler(adapter, `groups.${group.GroupID}.targetPositionRaw`, group, "setTargetPositionRawAsync");
        await targetPositionRawHandler.Initialize();
        disposableEvents.push(targetPositionRawHandler);
        const velocityHandler = new propertyLink_1.SimpleStateChangeHandler(adapter, `groups.${group.GroupID}.velocity`, "Velocity", group);
        await velocityHandler.Initialize();
        disposableEvents.push(velocityHandler);
        return disposableEvents;
    }
}
exports.SetupGroups = SetupGroups;
//# sourceMappingURL=setupGroups.js.map