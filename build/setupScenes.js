"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const propertyLink_1 = require("./util/propertyLink");
const stateHelper_1 = require("./util/stateHelper");
const utils_1 = require("./util/utils");
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
        }, {}, utils_1.ArrayCount(scenes));
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
        }, {}, utils_1.ArrayCount(scene.Products));
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
        // Setup scene listeners
        disposableEvents.push(new propertyLink_1.ComplexPropertyChangedHandler(adapter, "IsRunning", scene, async (newValue) => {
            const result = await adapter.setStateAsync(`scenes.${scene.SceneID}.run`, newValue, true);
            if (newValue === false) {
                /*
                    If a running scene was stopped by using the stop state,
                    the stop state should be reset to false.
                */
                await adapter.setStateChangedAsync(`scenes.${scene.SceneID}.stop`, false, true);
            }
            return result;
        }), new propertyLink_1.ComplexPropertyChangedHandler(adapter, "Products", scene, async (newValue) => {
            return await adapter.setStateChangedAsync(`scenes.${scene.SceneID}.productsCount`, utils_1.ArrayCount(newValue), true);
        }));
        // Setup state listeners
        const runListener = new propertyLink_1.ComplexStateChangeHandler(adapter, `scenes.${scene.SceneID}.run`, async (state) => {
            if (state !== undefined) {
                if ((state === null || state === void 0 ? void 0 : state.val) === true) {
                    // Acknowledge running state
                    await adapter.setStateAsync(`scenes.${scene.SceneID}.run`, state, true);
                    // Only start the scene if it's not running, already.
                    if (!scene.IsRunning) {
                        await scene.runAsync();
                    }
                }
            }
        });
        await runListener.Initialize();
        disposableEvents.push(runListener);
        const stopListener = new propertyLink_1.ComplexStateChangeHandler(adapter, `scenes.${scene.SceneID}.stop`, async (state) => {
            if (state !== undefined) {
                if ((state === null || state === void 0 ? void 0 : state.val) === true) {
                    // If the scene is running, acknowledge the stop state and stop the scene.
                    if (scene.IsRunning) {
                        // Acknowledge stop state first
                        await adapter.setStateAsync(`scenes.${scene.SceneID}.stop`, state, true);
                        await scene.stopAsync();
                    }
                    else {
                        // Set the stop state back to false, directly.
                        await adapter.setStateAsync(`scenes.${scene.SceneID}.stop`, false, true);
                    }
                }
            }
        });
        await stopListener.Initialize();
        disposableEvents.push(stopListener);
        return disposableEvents;
    }
}
exports.SetupScenes = SetupScenes;
//# sourceMappingURL=setupScenes.js.map