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
var setupScenes_exports = {};
__export(setupScenes_exports, {
  SetupScenes: () => SetupScenes
});
module.exports = __toCommonJS(setupScenes_exports);
var import_propertyLink = require("./util/propertyLink");
var import_stateHelper = require("./util/stateHelper");
var import_utils = require("./util/utils");
class SetupScenes {
  static async createScenesAsync(adapter, scenes) {
    const disposableEvents = [];
    const currentScenesList = await adapter.getChannelsOfAsync(`scenes`);
    adapter.log.debug(`Current Scenes List: ${JSON.stringify(currentScenesList)}`);
    const channelsToRemove = currentScenesList.filter(
      (channel) => !scenes.some((scene) => {
        return scene.SceneID === Number.parseInt(channel._id.split(".").reverse()[0]);
      })
    );
    for (const channel of channelsToRemove) {
      await adapter.deleteChannelAsync(`scenes`, channel._id);
    }
    if (channelsToRemove.length !== 0) {
      adapter.log.info(`${channelsToRemove.length} unknown scenes removed.`);
    }
    for (const scene of scenes) {
      if (scene) {
        disposableEvents.push(...await this.createSceneAsync(adapter, scene));
      }
    }
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      `scenes.scenesFound`,
      {
        name: "Number of scenes found",
        role: "value",
        type: "number",
        read: true,
        write: false,
        min: 0,
        def: 0,
        desc: "Number of scenes defined in the interface"
      },
      {},
      (0, import_utils.ArrayCount)(scenes)
    );
    return disposableEvents;
  }
  static async createSceneAsync(adapter, scene) {
    const disposableEvents = [];
    await adapter.setObjectNotExistsAsync(`scenes.${scene.SceneID}`, {
      type: "channel",
      common: {
        name: scene.SceneName,
        role: "scene"
      },
      native: {}
    });
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      `scenes.${scene.SceneID}.productsCount`,
      {
        name: "productsCount",
        role: "value",
        type: "number",
        read: true,
        write: false,
        desc: "Number of products in the scene"
      },
      {},
      (0, import_utils.ArrayCount)(scene.Products)
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      `scenes.${scene.SceneID}.products`,
      {
        name: "products",
        role: "value",
        type: "array",
        read: true,
        write: false,
        desc: "Array of products in the scene"
      },
      {},
      {
        val: JSON.stringify(scene.Products)
      }
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      `scenes.${scene.SceneID}.run`,
      {
        name: "run",
        role: "button.play",
        type: "boolean",
        read: true,
        write: true,
        desc: "Shows the running state of a scene. Set to true to run a scene."
      },
      {},
      scene.IsRunning
    );
    await import_stateHelper.StateHelper.createAndSetStateAsync(
      adapter,
      `scenes.${scene.SceneID}.stop`,
      {
        name: "stop",
        role: "button.stop",
        type: "boolean",
        read: false,
        write: true,
        desc: "Set to true to stop a running scene."
      },
      {},
      false
    );
    await adapter.setObjectNotExistsAsync(`scenes.${scene.SceneID}.velocity`, {
      type: "state",
      common: {
        name: "velocity",
        role: "value",
        type: "number",
        read: false,
        write: true,
        min: 0,
        max: 255,
        desc: "Velocity of the scene.",
        states: {
          "0": "Default",
          "1": "Silent",
          "2": "Fast",
          "255": "NotAvailable"
        },
        def: 0
      },
      native: {}
    });
    disposableEvents.push(
      new import_propertyLink.ComplexPropertyChangedHandler(adapter, "IsRunning", scene, async (newValue) => {
        const result = await adapter.setStateAsync(`scenes.${scene.SceneID}.run`, newValue, true);
        if (newValue === false) {
          await adapter.setStateChangedAsync(`scenes.${scene.SceneID}.stop`, false, true);
        }
        return result;
      }),
      new import_propertyLink.ComplexPropertyChangedHandler(adapter, "Products", scene, async (newValue) => {
        await adapter.setStateChangedAsync(
          `scenes.${scene.SceneID}.products`,
          {
            val: JSON.stringify(newValue)
          },
          true
        );
        return await adapter.setStateChangedAsync(
          `scenes.${scene.SceneID}.productsCount`,
          (0, import_utils.ArrayCount)(newValue),
          true
        );
      })
    );
    const runListener = new import_propertyLink.ComplexStateChangeHandler(adapter, `scenes.${scene.SceneID}.run`, async (state) => {
      var _a;
      if (state !== void 0) {
        if ((state == null ? void 0 : state.val) === true) {
          await adapter.setStateAsync(`scenes.${scene.SceneID}.run`, state, true);
          if (!scene.IsRunning) {
            const velocity = (_a = await adapter.getStateAsync(`scenes.${scene.SceneID}.velocity`)) == null ? void 0 : _a.val;
            await scene.runAsync(velocity);
          }
        }
      }
    });
    await runListener.Initialize();
    disposableEvents.push(runListener);
    const stopListener = new import_propertyLink.ComplexStateChangeHandler(adapter, `scenes.${scene.SceneID}.stop`, async (state) => {
      if (state !== void 0) {
        if ((state == null ? void 0 : state.val) === true) {
          if (scene.IsRunning) {
            await adapter.setStateAsync(`scenes.${scene.SceneID}.stop`, state, true);
            await scene.stopAsync();
          } else {
            await adapter.setStateAsync(`scenes.${scene.SceneID}.stop`, false, true);
          }
        }
      }
    });
    await stopListener.Initialize();
    disposableEvents.push(stopListener);
    const velocityListener = new import_propertyLink.EchoStateChangeHandler(adapter, `scenes.${scene.SceneID}.velocity`);
    await velocityListener.Initialize();
    disposableEvents.push(velocityListener);
    return disposableEvents;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SetupScenes
});
//# sourceMappingURL=setupScenes.js.map
