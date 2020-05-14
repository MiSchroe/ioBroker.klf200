"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const klf_200_api_1 = require("klf-200-api");
const converter_1 = require("./util/converter");
const stateHelper_1 = require("./util/stateHelper");
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
        }, {}, groups.length);
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
        }, {}, group.GroupType);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `groups.${group.GroupID}.productsCount`, {
            name: "productsCount",
            role: "value",
            type: "number",
            read: true,
            write: false,
            desc: `Number of products that are contained in the group.`,
        }, {}, group.Nodes.length);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `groups.${group.GroupID}.nodeVariation`, {
            name: "nodeVariation",
            role: "value",
            type: "number",
            read: true,
            write: true,
            min: 0,
            max: 0xff,
            desc: `Variation of the group.`,
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
            write: false,
            min: 0,
            max: 0xff,
            desc: "Velocity of the group",
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
        // Setup product listener
        disposableEvents.push(group.propertyChangedEvent.on(async function (event) {
            const stateName = mapPropertyToState[event.propertyName];
            const groupID = event.o.GroupID;
            await adapter.setStateAsync(`groups.${groupID}.${stateName}`, event.propertyValue, true);
        }));
        return disposableEvents;
    }
}
exports.SetupGroups = SetupGroups;
