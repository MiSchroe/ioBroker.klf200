"use strict";

import { Scene, Scenes, Velocity } from "klf-200-api";
import { DisposalMap } from "./disposalMap";
import {
	ComplexPropertyChangedHandler,
	ComplexStateChangeHandler,
	EchoStateChangeHandler,
	MethodCallStateChangeHandler,
} from "./util/propertyLink";
import { StateHelper } from "./util/stateHelper";
import { ArrayCount } from "./util/utils";

export class SetupScenes {
	public static async createScenesAsync(
		adapter: ioBroker.Adapter,
		scenes: Scenes,
		disposalMap: DisposalMap,
	): Promise<void> {
		// Remove old scenes
		const currentScenesList = await adapter.getChannelsOfAsync(`scenes`);
		adapter.log.debug(`Current Scenes List: ${JSON.stringify(currentScenesList)}`);
		// Filter current channels to contain only those, that are not present in the provided scenes list
		const channelsToRemove = currentScenesList.filter(
			(channel) =>
				!scenes.Scenes.some((scene) => {
					return scene && scene.SceneID === Number.parseInt(channel._id.split(".").reverse()[0]);
				}),
		);
		// Delete channels
		for (const channel of channelsToRemove) {
			const channelId = channel._id.split(".").reverse()[0];
			const sceneId = `scenes.${channelId}`;
			await disposalMap.disposeId(sceneId);
			await adapter.delObjectAsync(sceneId, { recursive: true });
		}
		if (channelsToRemove.length !== 0) {
			adapter.log.info(`${channelsToRemove.length} unknown scenes removed.`);
		}

		for (const scene of scenes.Scenes) {
			if (scene) {
				await SetupScenes.createSceneAsync(adapter, scene, disposalMap);
			}
		}

		// Write number of products
		await StateHelper.createAndSetStateAsync(
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
				desc: "Number of scenes defined in the interface",
			},
			{},
			ArrayCount(scenes.Scenes),
		);
		await StateHelper.createAndSetStateAsync(
			adapter,
			`scenes.refreshScenes`,
			{
				name: "Refresh the scenes list",
				role: "button.resume",
				type: "boolean",
				read: false,
				write: true,
				desc: "Refreshes the scenes list when set to true.",
			},
			{},
			false,
		);
		const refreshScenesChangeHandler = new MethodCallStateChangeHandler(
			adapter,
			"scenes.refreshScenes",
			scenes,
			"refreshScenesAsync",
		);
		await refreshScenesChangeHandler.Initialize();
		disposalMap.set("scenes.refreshScenes", refreshScenesChangeHandler);
	}

	public static async createSceneAsync(
		adapter: ioBroker.Adapter,
		scene: Scene,
		disposalMap: DisposalMap,
	): Promise<void> {
		adapter.log.info(`Setup objects for scene ${scene.SceneName}.`);

		await adapter.extendObject(`scenes.${scene.SceneID}`, {
			type: "channel",
			common: {
				name: scene.SceneName,
				role: "scene",
			},
			native: {},
		});

		await StateHelper.createAndSetStateAsync(
			adapter,
			`scenes.${scene.SceneID}.productsCount`,
			{
				name: "productsCount",
				role: "value",
				type: "number",
				read: true,
				write: false,
				desc: "Number of products in the scene",
			},
			{},
			ArrayCount(scene.Products),
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`scenes.${scene.SceneID}.products`,
			{
				name: "products",
				role: "value",
				type: "array",
				read: true,
				write: false,
				desc: "Array of products in the scene",
			},
			{},
			{
				val: JSON.stringify(scene.Products),
			},
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`scenes.${scene.SceneID}.run`,
			{
				name: "run",
				role: "button.play",
				type: "boolean",
				read: true,
				write: true,
				desc: "Shows the running state of a scene. Set to true to run a scene.",
			},
			{},
			scene.IsRunning,
		);

		await StateHelper.createAndSetStateAsync(
			adapter,
			`scenes.${scene.SceneID}.stop`,
			{
				name: "stop",
				role: "button.stop",
				type: "boolean",
				read: false,
				write: true,
				desc: "Set to true to stop a running scene.",
			},
			{},
			false,
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
				max: 0xff,
				desc: "Velocity of the scene.",
				states: {
					"0": "Default",
					"1": "Silent",
					"2": "Fast",
					"255": "NotAvailable",
				},
				def: 0,
			},
			native: {},
		});

		// Setup scene listeners
		disposalMap.set(
			`scenes.${scene.SceneID}.property.IsRunning`,
			new ComplexPropertyChangedHandler(adapter, "IsRunning", scene, async (newValue) => {
				await adapter.setState(`scenes.${scene.SceneID}.run`, newValue, true);
				if (newValue === false) {
					/*
						If a running scene was stopped by using the stop state,
						the stop state should be reset to false.
					*/
					await adapter.setStateChangedAsync(`scenes.${scene.SceneID}.stop`, false, true);
				}
			}),
		);
		disposalMap.set(
			`scenes.${scene.SceneID}.property.Products`,
			new ComplexPropertyChangedHandler(adapter, "Products", scene, async (newValue) => {
				await adapter.setStateChangedAsync(
					`scenes.${scene.SceneID}.products`,
					{
						val: JSON.stringify(newValue),
					},
					true,
				);
				await adapter.setStateChangedAsync(`scenes.${scene.SceneID}.productsCount`, ArrayCount(newValue), true);
			}),
		);

		// Setup state listeners
		const runStateId = `scenes.${scene.SceneID}.run`;
		const runListener = new ComplexStateChangeHandler(adapter, runStateId, async (state) => {
			if (state !== undefined) {
				if (state?.val === true) {
					// Acknowledge running state
					await adapter.setState(runStateId, state, true);
					// Only start the scene if it's not running, already.
					if (!scene.IsRunning) {
						// Get the velocity
						const velocity = (await adapter.getStateAsync(`scenes.${scene.SceneID}.velocity`))?.val as
							| Velocity
							| Velocity.Default;
						// Run the scene
						await scene.runAsync(velocity);
					}
				}
			}
		});
		await runListener.Initialize();
		disposalMap.set(runStateId, runListener);

		const stopStateId = `scenes.${scene.SceneID}.stop`;
		const stopListener = new ComplexStateChangeHandler(adapter, stopStateId, async (state) => {
			if (state !== undefined) {
				if (state?.val === true) {
					// If the scene is running, acknowledge the stop state and stop the scene.
					if (scene.IsRunning) {
						// Acknowledge stop state first
						await adapter.setState(stopStateId, state, true);
						await scene.stopAsync();
					} else {
						// Set the stop state back to false, directly.
						await adapter.setState(stopStateId, false, true);
					}
				}
			}
		});
		await stopListener.Initialize();
		disposalMap.set(stopStateId, stopListener);

		const velocityStateId = `scenes.${scene.SceneID}.velocity`;
		const velocityListener = new EchoStateChangeHandler(adapter, velocityStateId);
		await velocityListener.Initialize();
		disposalMap.set(velocityStateId, velocityListener);
	}
}
