"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var setupGroups_exports = {};
__export(setupGroups_exports, {
  SetupGroups: () => SetupGroups
});
module.exports = __toCommonJS(setupGroups_exports);
var import_klf_200_api = require("klf-200-api");
var import_converter = require("./util/converter");
var import_propertyLink = require("./util/propertyLink");
var import_stateHelper = require("./util/stateHelper");
var import_utils = require("./util/utils");
class SetupGroups {
  static async createGroupsAsync(adapter, groups, products) {
    const disposableEvents = [];
    const currentGroupsList = await adapter.getChannelsOfAsync(`groups`);
    adapter.log.debug(`Current Groups List: ${JSON.stringify(currentGroupsList)}`);
    const channelsToRemove = currentGroupsList.filter(
      (channel) => !groups.some((group) => {
        return group.GroupID === Number.parseInt(channel._id.split(".").reverse()[0]);
      })
    );
    for (const channel of channelsToRemove) {
      await adapter.deleteChannelAsync(`groups`, channel._id);
    }
    if (channelsToRemove.length !== 0) {
      adapter.log.info(`${channelsToRemove.length} unknown groups removed.`);
    }
    for (const group of groups) {
      if (group) {
        disposableEvents.push(...await this.createGroupAsync(adapter, group, products));
      }
    }
    await import_stateHelper.StateHelper.createAndSetStateAsync(
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
        desc: "Number of groups defined in the interface"
      },
      {},
      (0, import_utils.ArrayCount)(groups)
    );
    return disposableEvents;
  }
  static async createGroupAsync(adapter, group, products) {
    const disposableEvents = [];
    await adapter.setObjectNotExistsAsync(`groups.${group.GroupID}`, {
      type: "channel",
      common: {
        name: group.Name,
        role: import_converter.roleGroupTypeConverter.convert(group.GroupType)
      },
      native: {}
    });
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      `groups.${group.GroupID}.groupType`,
      {
        name: "groupType",
        role: import_converter.roleGroupTypeConverter.convert(group.GroupType),
        type: "number",
        read: true,
        write: false,
        desc: `Type of the registered group (${import_klf_200_api.GroupType.House} = house, ${import_klf_200_api.GroupType.Room} = room or ${import_klf_200_api.GroupType.UserGroup} = user defined group)`,
        states: {
          "0": "UserGroup",
          "1": "Room",
          "2": "House",
          "3": "All"
        }
      },
      {},
      group.GroupType
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      `groups.${group.GroupID}.productsCount`,
      {
        name: "productsCount",
        role: "value",
        type: "number",
        read: true,
        write: false,
        desc: `Number of products that are contained in the group.`
      },
      {},
      (0, import_utils.ArrayCount)(group.Nodes)
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      `groups.${group.GroupID}.nodeVariation`,
      {
        name: "nodeVariation",
        role: "value",
        type: "number",
        read: true,
        write: true,
        min: 0,
        max: 255,
        desc: `Variation of the group.`,
        states: {
          "0": "NotSet",
          "1": "TopHung",
          "2": "Kip",
          "3": "FlatRoof",
          "4": "SkyLight"
        }
      },
      {},
      group.NodeVariation
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      `groups.${group.GroupID}.order`,
      {
        name: "order",
        role: "value",
        type: "number",
        read: true,
        write: true,
        min: 0,
        max: 65535,
        desc: "Custom order of groups"
      },
      {},
      group.Order
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      `groups.${group.GroupID}.placement`,
      {
        name: "placement",
        role: "value",
        type: "number",
        read: true,
        write: true,
        min: 0,
        max: 255,
        desc: "Placement (house = 0 or room number)"
      },
      {},
      group.Placement
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      `groups.${group.GroupID}.velocity`,
      {
        name: "velocity",
        role: "value",
        type: "number",
        read: true,
        write: true,
        min: 0,
        max: 255,
        desc: "Velocity of the group",
        states: {
          "0": "Default",
          "1": "Silent",
          "2": "Fast",
          "255": "NotAvailable"
        }
      },
      {},
      group.Velocity
    );
    await adapter.setObjectNotExistsAsync(`groups.${group.GroupID}.targetPosition`, {
      type: "state",
      common: {
        name: "targetPosition",
        role: import_converter.levelConverter.convert(products[group.Nodes[0]].TypeID),
        type: "number",
        read: false,
        write: true,
        min: 0,
        max: 100,
        unit: "%",
        desc: "Level in percent"
      },
      native: {}
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
        max: 65535,
        desc: "Target position raw value"
      },
      native: {}
    });
    disposableEvents.push(
      new import_propertyLink.SimplePropertyChangedHandler(
        adapter,
        `groups.${group.GroupID}.nodeVariation`,
        "NodeVariation",
        group
      ),
      new import_propertyLink.SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.order`, "Order", group),
      new import_propertyLink.SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.placement`, "Placement", group),
      new import_propertyLink.SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.velocity`, "Velocity", group),
      new import_propertyLink.SimplePropertyChangedHandler(adapter, `groups.${group.GroupID}.groupType`, "GroupType", group),
      new import_propertyLink.ComplexPropertyChangedHandler(adapter, "Nodes", group, async (newValue) => {
        return await adapter.setStateChangedAsync(
          `groups.${group.GroupID}.productsCount`,
          (0, import_utils.ArrayCount)(newValue),
          true
        );
      })
    );
    const nodeVariationHandler = new import_propertyLink.SimpleStateChangeHandler(
      adapter,
      `groups.${group.GroupID}.nodeVariation`,
      "NodeVariation",
      group
    );
    await nodeVariationHandler.Initialize();
    disposableEvents.push(nodeVariationHandler);
    const orderHandler = new import_propertyLink.SimpleStateChangeHandler(
      adapter,
      `groups.${group.GroupID}.order`,
      "Order",
      group
    );
    await orderHandler.Initialize();
    disposableEvents.push(orderHandler);
    const placementHandler = new import_propertyLink.SimpleStateChangeHandler(
      adapter,
      `groups.${group.GroupID}.placement`,
      "Placement",
      group
    );
    await placementHandler.Initialize();
    disposableEvents.push(placementHandler);
    const targetPositionHandler = new import_propertyLink.PercentageStateChangeHandler(
      adapter,
      `groups.${group.GroupID}.targetPosition`,
      group,
      "setTargetPositionAsync"
    );
    await targetPositionHandler.Initialize();
    disposableEvents.push(targetPositionHandler);
    const targetPositionRawHandler = new import_propertyLink.SetterStateChangeHandler(
      adapter,
      `groups.${group.GroupID}.targetPositionRaw`,
      group,
      "setTargetPositionRawAsync"
    );
    await targetPositionRawHandler.Initialize();
    disposableEvents.push(targetPositionRawHandler);
    const velocityHandler = new import_propertyLink.SimpleStateChangeHandler(
      adapter,
      `groups.${group.GroupID}.velocity`,
      "Velocity",
      group
    );
    await velocityHandler.Initialize();
    disposableEvents.push(velocityHandler);
    return disposableEvents;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SetupGroups
});
//# sourceMappingURL=setupGroups.js.map
