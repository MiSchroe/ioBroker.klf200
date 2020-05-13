"use strict";

import { Product, Scene } from "klf-200-api";
import { PropertyChangedEvent } from "klf-200-api/dist/utils/PropertyChangedEvent";
import { Disposable } from "klf-200-api/dist/utils/TypedEvent";
import { StateHelper } from "./util/stateHelper";

export class SetupScenes {
	public static async createScenesAsync(adapter: ioBroker.Adapter, scenes: Scene[]): Promise<Disposable[]> {
		const disposableEvents: Disposable[] = [];

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
			scenes.length,
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
			scene.Products.length,
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

		// Setup scene listener
		disposableEvents.push(
			scene.propertyChangedEvent.on(async function (event: PropertyChangedEvent) {
				const sceneID = (event.o as Scene).SceneID;

				switch (event.propertyName) {
					case "IsRunning":
						await adapter.setStateAsync(`scenes.${sceneID}.run`, event.propertyValue, true);
						if ((event.propertyValue as boolean) === false) {
							/*
                            If a running scene was stopped by using the stop state,
                            the stop state should be reset to false.
                        */
							await adapter.setStateChangedAsync(`scenes.${sceneID}.stop`, false, true);
						}
						break;

					case "Products":
						await adapter.setStateAsync(
							`scenes.${sceneID}.productsCount`,
							(event.propertyValue as Product[]).length,
							true,
						);
						break;

					default:
						break;
				}
			}),
		);

		return disposableEvents;
	}
}
