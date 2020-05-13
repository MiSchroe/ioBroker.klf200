"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stateHelper_1 = require("./util/stateHelper");
class SetupScenes {
    static async createScenesAsync(adapter, scenes) {
        const disposableEvents = [];
        for (const scene of scenes) {
            if (scene) {
                disposableEvents.push(...(await this.createSceneAsync(adapter, scene)));
            }
        }
        // Write number of products
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `scenes.scenesFound`, {
            name: "Number of scenes found",
            role: "value",
            type: "number",
            read: true,
            write: false,
            min: 0,
            def: 0,
            desc: "Number of scenes defined in the interface",
        }, {}, scenes.length);
        return disposableEvents;
    }
    static async createSceneAsync(adapter, scene) {
        const disposableEvents = [];
        await adapter.setObjectNotExistsAsync(`scenes.${scene.SceneID}`, {
            type: "channel",
            common: {
                name: scene.SceneName,
                role: "scene",
            },
            native: {},
        });
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `scenes.${scene.SceneID}.productsCount`, {
            name: "productsCount",
            role: "value",
            type: "number",
            read: true,
            write: false,
            desc: "Number of products in the scene",
        }, {}, scene.Products.length);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `scenes.${scene.SceneID}.run`, {
            name: "run",
            role: "button.play",
            type: "boolean",
            read: true,
            write: true,
            desc: "Shows the running state of a scene. Set to true to run a scene.",
        }, {}, scene.IsRunning);
        await stateHelper_1.StateHelper.createAndSetStateAsync(adapter, `scenes.${scene.SceneID}.stop`, {
            name: "stop",
            role: "button.play",
            type: "boolean",
            read: false,
            write: true,
            desc: "Set to true to stop a running scene.",
        }, {}, false);
        // Setup scene listener
        disposableEvents.push(scene.propertyChangedEvent.on(async function (event) {
            const sceneID = event.o.SceneID;
            switch (event.propertyName) {
                case "IsRunning":
                    await adapter.setStateAsync(`scenes.${sceneID}.run`, event.propertyValue, true);
                    if (event.propertyValue === false) {
                        /*
                        If a running scene was stopped by using the stop state,
                        the stop state should be reset to false.
                    */
                        await adapter.setStateChangedAsync(`scenes.${sceneID}.stop`, false, true);
                    }
                    break;
                case "Products":
                    await adapter.setStateAsync(`scenes.${sceneID}.productsCount`, event.propertyValue.length, true);
                    break;
                default:
                    break;
            }
        }));
        return disposableEvents;
    }
}
exports.SetupScenes = SetupScenes;
