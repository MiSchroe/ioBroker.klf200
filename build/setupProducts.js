"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const converter_1 = require("./util/converter");
const stateHelper_1 = require("./util/stateHelper");
const mapPropertyToState = {
    CurrentPosition: "level",
    CurrentPositionRaw: "currentPositionRaw",
    FP1CurrentPositionRaw: "FP1CurrentPositionRaw",
    FP2CurrentPositionRaw: "FP2CurrentPositionRaw",
    FP3CurrentPositionRaw: "FP3CurrentPositionRaw",
    FP4CurrentPositionRaw: "FP4CurrentPositionRaw",
    NodeVariation: "nodeVariation",
    Order: "order",
    Placement: "placement",
    RemainingTime: "remainingTime",
    RunStatus: "runStatus",
    State: "state",
    StatusReply: "statusReply",
    TargetPositionRaw: "targetPositionRaw",
    Velocity: "velocity",
};
class SetupProducts {
    static async createProductsAsync(adapter, products) {
        const disposableEvents = [];
        for (const product of products) {
            if (products) {
                disposableEvents.push(...(await this.createProductAsync(adapter, product)));
            }
        }
        // Write number of products
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.productsFound`, {
            name: "Number of products found",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            def: 0,
            desc: "Number of products connected to the interface",
        }, {}, products.length);
        return disposableEvents;
    }
    static async createProductAsync(adapter, product) {
        const disposableEvents = [];
        await adapter.setObjectNotExistsAsync(`products.${product.NodeID}`, {
            type: "channel",
            common: {
                name: product.Name,
                role: converter_1.roleConverter.convert(product.TypeID),
            },
            native: {},
        });
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.category`, {
            name: "category",
            role: converter_1.roleConverter.convert(product.TypeID),
            type: "string",
            read: true,
            write: false,
            desc: "Category of the registered product",
        }, {}, product.Category);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.level`, {
            name: "level",
            role: converter_1.levelConverter.convert(product.TypeID),
            type: "number",
            read: true,
            write: true,
            min: 0,
            max: 100,
            unit: "%",
            desc: "Opening level in percent",
        }, {}, product.CurrentPosition * 100);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.currentPositionRaw`, {
            name: "currentPositionRaw",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xffff,
            desc: "Raw value of current position",
        }, {}, product.CurrentPositionRaw);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.FP1CurrentPositionRaw`, {
            name: "FP1CurrentPositionRaw",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xffff,
            desc: "Raw value of current position of functional parameter 1",
        }, {}, product.FP1CurrentPositionRaw);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.FP2CurrentPositionRaw`, {
            name: "FP2CurrentPositionRaw",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xffff,
            desc: "Raw value of current position of functional parameter 2",
        }, {}, product.FP2CurrentPositionRaw);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.FP3CurrentPositionRaw`, {
            name: "FP3CurrentPositionRaw",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xffff,
            desc: "Raw value of current position of functional parameter 3",
        }, {}, product.FP3CurrentPositionRaw);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.FP4CurrentPositionRaw`, {
            name: "FP4CurrentPositionRaw",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xffff,
            desc: "Raw value of current position of functional parameter 4",
        }, {}, product.FP4CurrentPositionRaw);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.nodeVariation`, {
            name: "nodeVariation",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xff,
            desc: "Node Variation",
        }, {}, product.NodeVariation);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.order`, {
            name: "order",
            role: "value",
            type: "number",
            read: true,
            write: true,
            min: 0,
            max: 0xffff,
            desc: "Custom order of products",
        }, {}, product.Order);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.placement`, {
            name: "placement",
            role: "value",
            type: "number",
            read: true,
            write: true,
            min: 0,
            max: 0xff,
            desc: "Placement (house = 0 or room number)",
        }, {}, product.Placement);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.powerSaveMode`, {
            name: "powerSaveMode",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xff,
            desc: "Power save mode",
        }, {}, product.PowerSaveMode);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.productType`, {
            name: "productType",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xffff,
            desc: "Product type",
        }, {}, product.ProductType);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.remainingTime`, {
            name: "remainingTime",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xffff,
            desc: "Remaining time of current operation in seconds",
        }, {}, product.RemainingTime);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.runStatus`, {
            name: "runStatus",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xff,
            desc: "Current run status",
        }, {}, product.RunStatus);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.serialNumber`, {
            name: "serialNumber",
            role: "value",
            type: "string",
            read: true,
            write: false,
            desc: "Serial number",
        }, {}, `${product.SerialNumber.toString("hex").replace(/(..)/g, ":$1").slice(1)}`);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.state`, {
            name: "state",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xff,
            desc: "Operating state",
        }, {}, product.State);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.statusReply`, {
            name: "statusReply",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xff,
            desc: "Status reply",
        }, {}, product.StatusReply);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.subType`, {
            name: "subType",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0b00111111,
            desc: "",
        }, {}, product.SubType);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.targetPositionRaw`, {
            name: "targetPositionRaw",
            role: "value",
            type: "number",
            read: true,
            write: true,
            min: 0,
            max: 0xffff,
            desc: "Target position raw value",
        }, {}, product.TargetPositionRaw);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.timestamp`, {
            name: "timestamp",
            role: "value",
            type: "string",
            read: true,
            write: false,
            desc: "Timestamp of the last data",
        }, {}, product.TimeStamp.toString());
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.typeID`, {
            name: "typeID",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0b0000001111111111,
            desc: "Product type",
        }, {}, product.TypeID);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.velocity`, {
            name: "velocity",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            max: 0xff,
            desc: "Velocity of the product",
        }, {}, product.Velocity);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.stop`, {
            name: "stop",
            role: "button.play",
            type: "boolean",
            read: false,
            write: true,
            desc: "Set to true to stop the current operation",
        }, {}, false);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `products.${product.NodeID}.wink`, {
            name: "wink",
            role: "button.play",
            type: "boolean",
            read: false,
            write: true,
            desc: "Set to true to let the product wink",
        }, {}, false);
        // Setup product listener
        disposableEvents.push(product.propertyChangedEvent.on(async function (event) {
            const stateName = mapPropertyToState[event.propertyName];
            const productID = event.o.NodeID;
            await adapter.setStateAsync(`products.${productID}.${stateName}`, event.propertyValue, true);
        }));
        return disposableEvents;
    }
}
exports.SetupProducts = SetupProducts;
