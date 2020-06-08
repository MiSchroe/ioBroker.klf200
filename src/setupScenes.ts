"use strict";

import { Scene, SceneInformationEntry } from "klf-200-api";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";
import { ComplexPropertyChangedHandler, ComplexStateChangeHandler } from "./util/propertyLink";
import { StateHelper } from "./util/stateHelper";
import { ArrayCount } from "./util/utils";

export class SetupScenes {
	public static async createScenesAsync(adapter: ioBroker.Adapter, scenes: Scene[]): Promise<Disposable[]> {
		const disposableEvents: Disposable[] = [];

		// Remove old scenes
		const currentScenesList = await adapter.getChannelsOfAsync(`scenes`);
		adapter.log.debug(`Current Scenes List: ${JSON.stringify(currentScenesList)}`);
		// Filter current channels to contain only those, that are not present in the provided scenes list
		const channelsToRemove = currentScenesList.filter(
			(channel) =>
				!scenes.some((scene) => {
					return scene.SceneID === Number.parseInt(channel._id.split(".").reverse()[0]);
				}),
		);
		// Delete channels
		for (const channel of channelsToRemove) {
			await adapter.deleteChannelAsync(`scenes`, channel._id);
		}
		if (channelsToRemove.length !== 0) {
			adapter.log.info(`${channelsToRemove.length} unknown scenes removed.`);
		}

		for (const scene of scenes) {
			if (scene) {
				disposableEvents.push(...(await this.createSceneAsync(adapter, scene)));
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
			ArrayCount(scenes),
		);

		return disposableEvents;
	}

	public static async createSceneAsync(adapter: ioBroker.Adapter, scene: Scene): Promise<Disposable[]> {
		const disposableEvents: Disposable[] = [];

		await adapter.setObjectNotExistsAsync(`scenes.${scene.SceneID}`, {
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
				role: "button.play",
				type: "boolean",
				read: false,
				write: true,
				desc: "Set to true to stop a running scene.",
			},
			{},
			false,
		);

		// Setup scene listeners
		disposableEvents.push(
			new ComplexPropertyChangedHandler<Scene>(adapter, "IsRunning", scene, async (newValue) => {
				const result = await adapter.setStateAsync(`scenes.${scene.SceneID}.run`, newValue as boolean, true);
				if (newValue === false) {
					/*
						If a running scene was stopped by using the stop state,
						the stop state should be reset to false.
					*/
					await adapter.setStateChangedAsync(`scenes.${scene.SceneID}.stop`, false, true);
				}
				return result;
			}),
			new ComplexPropertyChangedHandler<Scene>(adapter, "Products", scene, async (newValue) => {
				return await adapter.setStateChangedAsync(
					`scenes.${scene.SceneID}.productsCount`,
					ArrayCount(newValue as SceneInformationEntry[]),
					true,
				);
			}),
		);

		// Setup state listeners
		const runListener = new ComplexStateChangeHandler(adapter, `scenes.${scene.SceneID}.run`, async (state) => {
			if (state !== undefined) {
				if (state?.val === true) {
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

		const stopListener = new ComplexStateChangeHandler(adapter, `scenes.${scene.SceneID}.stop`, async (state) => {
			if (state !== undefined) {
				if (state?.val === true) {
					// If the scene is running, acknowledge the stop state and stop the scene.
					if (scene.IsRunning) {
						// Acknowledge stop state first
						await adapter.setStateAsync(`scenes.${scene.SceneID}.stop`, state, true);
						await scene.stopAsync();
					} else {
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
