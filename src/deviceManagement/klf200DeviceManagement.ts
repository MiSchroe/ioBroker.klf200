import {
	type ActionContext,
	type DeviceInfo,
	type DeviceLoadContext,
	type DeviceRefreshResponse,
	type InstanceDetails,
	type InstanceRefreshResponse,
	type JsonFormData,
	type JsonFormSchema,
	DeviceManagement,
} from "@iobroker/dm-utils";
import type { ProgressDialog } from "@iobroker/dm-utils/build/ProgressDialog.js";
import { ActuatorType } from "klf-200-api";
import type { Klf200 } from "../klf200Adapter.js";

type GroupEditDialogData = {
	dialogTitle: ioBroker.StringOrTranslated;
	groupId?: number;
	groupName?: string;
	products: number[];
};

type GroupEditResultData = Omit<GroupEditDialogData, "dialogTitle">;

/**
 * KLF200 Device Management
 */
export class KLF200DeviceManagement extends DeviceManagement<Klf200> {
	protected override async loadDevices(context: DeviceLoadContext<string>): Promise<void> {
		this.adapter.log.debug(`KLF200DeviceManagement: loadDevices called.`);
		const devices: DeviceInfo<string>[] = [];

		// Setup products
		if (this.adapter.Products) {
			for (const product of this.adapter.Products.Products) {
				if (product) {
					devices.push({
						id: `products.${product.NodeID}`,
						name: product.Name,
						icon: "window",
						actions: [
							{
								id: "deleteProduct",
								icon: "delete",
								description: await this.adapter.getTranslatedObject("dm-device-product-delete"),
								handler: (deviceId, actionContext) => this.handleProductDelete(deviceId, actionContext),
							},
							{
								id: "renameProduct",
								icon: "rename",
								description: await this.adapter.getTranslatedObject("dm-device-product-rename"),
								handler: (deviceId, actionContext) => this.handleProductRename(deviceId, actionContext),
							},
							{
								id: "winkProduct",
								icon: "identify",
								description: await this.adapter.getTranslatedObject("dm-device-product-wink"),
								handler: (deviceId, actionContext) => this.handleProductWink(deviceId, actionContext),
							},
						],
					});
				}
			}
		}

		// Setup groups
		if (this.adapter.Groups) {
			for (const group of this.adapter.Groups.Groups) {
				if (group) {
					devices.push({
						id: `groups.${group.GroupID}`,
						name: group.Name,
						icon: "location",
						actions: [
							{
								id: "deleteGroup",
								icon: "delete",
								description: await this.adapter.getTranslatedObject("dm-device-group-delete"),
								handler: (deviceId, actionContext) => this.handleGroupDelete(deviceId, actionContext),
							},
							{
								id: "editGroup",
								icon: "edit",
								description: await this.adapter.getTranslatedObject("dm-device-group-edit"),
								handler: (deviceId, actionContext) => this.handleEditGroup(deviceId, actionContext),
							},
						],
					});
				}
			}
		}

		// Setup scenes
		if (this.adapter.Scenes) {
			for (const scene of this.adapter.Scenes.Scenes) {
				if (scene) {
					devices.push({
						id: `scenes.${scene.SceneID}`,
						name: scene.SceneName,
						icon: "media",
						actions: [
							{
								id: "deleteScene",
								icon: "delete",
								description: await this.adapter.getTranslatedObject("dm-device-scene-delete"),
								handler: (deviceId, actionContext) => this.handleSceneDelete(deviceId, actionContext),
							},
							{
								id: "renameScene",
								icon: "rename",
								description: await this.adapter.getTranslatedObject("dm-device-scene-rename"),
								handler: (deviceId, actionContext) => this.handleSceneRename(deviceId, actionContext),
							},
						],
					});
				}
			}
		}
		this.adapter.log.debug(`KLF200DeviceManagement: loadDevices: Reporting ${JSON.stringify(devices)}.`);
		context.setTotalDevices(devices.length);
		for (const device of devices) {
			context.addDevice(device);
		}
	}
	protected override async getInstanceInfo(): Promise<InstanceDetails> {
		this.adapter.log.debug(`KLF200DeviceManagement: getInstanceInfo called.`);
		const instanceDetails: InstanceDetails = {
			...(await Promise.resolve(super.getInstanceInfo())),
			apiVersion: "v3",
			actions: [
				{
					id: "discover",
					icon: "discover",
					description: await this.adapter.getTranslatedObject("dm-instance-discover"),
					handler: actionContext => this.handleInstanceDiscover(actionContext),
				},
				{
					id: "addGroup",
					icon: "group",
					description: await this.adapter.getTranslatedObject("dm-instance-creategroup"),
					handler: actionContext => this.handleAddGroup(actionContext),
				},
				{
					id: "addScene",
					icon: "play",
					description: await this.adapter.getTranslatedObject("dm-instance-createscene"),
					handler: actionContext => this.handleAddScene(actionContext),
				},
				// {
				// 	id: "sendToRemote",
				// 	icon: "fas fa-upload",
				// 	description: await this.adapter.getTranslatedObject("dm-instance-sendtoremote"),
				// 	handler: actionContext => this.handleSendToRemote(actionContext),
				// },
				// {
				// 	id: "receiveFromRemote",
				// 	icon: "fas fa-download",
				// 	description: await this.adapter.getTranslatedObject("dm-instance-receivefromremote"),
				// 	handler: actionContext => this.handleReceiveFromRemote(actionContext),
				// },
			],
		};
		this.adapter.log.debug(
			`KLF200DeviceManagement: getInstanceInfo: Returning ${JSON.stringify(instanceDetails)}.`,
		);
		return Promise.resolve(instanceDetails);
	}

	// protected override getDeviceDetails(id: string): RetVal<DeviceDetails<string> | null | { error: string }> {}

	private async handleInstanceDiscover(context: ActionContext): Promise<InstanceRefreshResponse> {
		// Start discovery
		const progressDialog = await context.openProgress(
			await this.adapter.translate("dm-instance-discover-progress-title"),
			{ indeterminate: true },
		);
		try {
			try {
				const refresh = await this.adapter.onDiscover();
				// Return the result
				return { refresh: refresh };
			} catch (error) {
				await context.showMessage(
					`${await this.adapter.translate("dm-instance-discover-progress-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			// Return the result
			return { refresh: true };
		} finally {
			await progressDialog.close();
		}
	}

	private async handleSendToRemote(context: ActionContext): Promise<InstanceRefreshResponse> {
		await context.showMessage("Not implemented.");
		return { refresh: false };
	}

	private async handleReceiveFromRemote(context: ActionContext): Promise<InstanceRefreshResponse> {
		await context.showMessage("Not implemented.");
		return { refresh: false };
	}

	private async handleProductDelete(
		deviceId: string,
		context: ActionContext,
	): Promise<DeviceRefreshResponse<string>> {
		const productId = parseInt(deviceId.split(".").reverse()[0]);
		const confirmationDialog = await context.showConfirmation(
			await this.adapter.translate("dm-device-product-delete-confirm", { productId: productId.toString() }),
		);
		if (confirmationDialog) {
			try {
				await this.adapter.onRemoveProduct(productId);
			} catch (error) {
				await context.showMessage(
					`${await this.adapter.translate("dm-device-product-delete-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return { refresh: "devices" };
		}
		return { refresh: "none" };
	}

	private async handleProductRename(
		deviceId: string,
		context: ActionContext,
	): Promise<DeviceRefreshResponse<string>> {
		const productId = parseInt(deviceId.split(".").reverse()[0]);
		const product = this.adapter.Products?.Products[productId];

		if (!product) {
			throw new Error(`Product with ID ${productId} not found in adapter.`);
		}

		const oldName = product.Name;
		const newName = await this.showRenameForm(
			context,
			await this.adapter.getTranslatedObject("dm-device-product-rename-form-title"),
			await this.adapter.getTranslatedObject("dm-device-product-rename-form-label"),
			oldName,
		);
		if (newName !== undefined) {
			try {
				await this.adapter.onRenameProduct(productId, newName);
			} catch (error) {
				await context.showMessage(
					`${await this.adapter.translate("dm-device-product-rename-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return { refresh: "devices" };
		}
		return { refresh: "none" };
	}

	private async handleProductWink(deviceId: string, context: ActionContext): Promise<DeviceRefreshResponse<string>> {
		const productId = parseInt(deviceId.split(".").reverse()[0]);
		try {
			await this.adapter.onWinkProduct(productId);
		} catch (error) {
			await context.showMessage(
				`${await this.adapter.translate("dm-device-product-wink-error")}\n${this.getErrorMessage(error)}.`,
			);
		}
		return { refresh: "none" };
	}

	private async showGroupEditDialog(
		context: ActionContext,
		groupEditDialogData: GroupEditDialogData,
	): Promise<GroupEditResultData | undefined> {
		const form: JsonFormSchema = {
			type: "panel",
			items: {
				groupId: {
					type: "text",
					label: "Group ID",
					disabled: "true",
					hidden: "data.groupId === undefined",
					placeholder: await this.adapter.getTranslatedObject(
						"dm-device-group-edit-form-groupId-placeholder",
					),
				},
				groupName: {
					type: "text",
					label: "Group name",
					validator: "data.groupName !== undefined && data.groupName !== ''",
					validatorErrorText: await this.adapter.translate(
						"dm-device-group-edit-form-groupName-validatorErrorText",
					),
					validatorNoSaveOnError: true,
				},
				tableHeaderCB: {
					type: "staticText",
					xs: 2,
					newLine: true,
					text: "ID",
					controlStyle: {},
				},
				tableHeaderProductName: {
					type: "staticText",
					text: await this.adapter.translate("dm-device-group-edit-form-tableHeaderProductName-label"),
					controlStyle: {},
				},
			},
		};
		const formData: JsonFormData = {
			groupId: groupEditDialogData.groupId,
			groupName: groupEditDialogData.groupName,
		};
		if (this.adapter.Products) {
			// Group the products by actuator type ID.
			// Only products with the same type can be in the same group.
			const productsByTypeMap = new Map<ActuatorType, string[]>();
			if (this.adapter.Products && this.adapter.Products.Products) {
				for (const product of this.adapter.Products.Products) {
					if (!productsByTypeMap.has(product.TypeID)) {
						productsByTypeMap.set(product.TypeID, []);
					}
					productsByTypeMap.get(product.TypeID)?.push(`data.cb_${product.NodeID} === true`);
				}
			}

			// Create the disabled conditions
			const conditionsMap = new Map<ActuatorType, string>();
			for (const actuatorType of productsByTypeMap.keys()) {
				let condition = "";
				for (const otherActuatorType of productsByTypeMap.keys()) {
					if (otherActuatorType === actuatorType) {
						continue;
					} // Skip if it's the same type
					const addCondition = productsByTypeMap.get(otherActuatorType)?.join(" || ");
					if (addCondition !== undefined && addCondition !== "") {
						condition = condition === "" ? addCondition : [condition, addCondition].join(" || ");
					}
				}
				if (condition !== "") {
					conditionsMap.set(actuatorType, condition);
				}
			}

			// Create list
			if (this.adapter.Products && this.adapter.Products.Products) {
				for (const product of this.adapter.Products.Products) {
					if (product) {
						const cbName = `cb_${product.NodeID}`;
						form.items[cbName] = {
							type: "checkbox",
							xs: 2,
							newLine: true,
							label: `${product.NodeID}`,
							disabled: conditionsMap.get(product.TypeID),
						};
						form.items[`${product.NodeID}_name`] = {
							type: "staticText",
							text: product.Name,
							tooltip: ActuatorType[product.TypeID],
							data: product.TypeID,
							disabled: conditionsMap.get(product.TypeID),
							controlStyle: {},
						};
						formData[cbName] = groupEditDialogData.products.includes(product.NodeID);

						if (!productsByTypeMap.has(product.TypeID)) {
							productsByTypeMap.set(product.TypeID, []);
						}
						productsByTypeMap.get(product.TypeID)?.push(cbName);
					}
				}
			}
		}
		const resultFormData = await context.showForm(form, {
			data: formData,
			title: groupEditDialogData.dialogTitle,
		});
		if (resultFormData === undefined) {
			return undefined;
		}

		const result: GroupEditResultData = {
			groupId: groupEditDialogData.groupId,
			groupName: resultFormData.groupName as string,
			products: [],
		};
		if (this.adapter.Products) {
			for (const product of this.adapter.Products.Products) {
				if (product) {
					const cbName = `cb_${product.NodeID}`;
					if (resultFormData[cbName]) {
						result.products.push(product.NodeID);
					}
				}
			}
		}
		return result;
	}

	private async handleAddGroup(context: ActionContext): Promise<InstanceRefreshResponse> {
		const newGroup = await this.showGroupEditDialog(context, {
			dialogTitle: await this.adapter.getTranslatedObject("dm-instance-creategroup-form-title"),
			products: [],
		});
		if (newGroup === undefined) {
			return { refresh: false };
		}
		try {
			await this.adapter.onAddGroup(newGroup.groupName || "", newGroup.products);
		} catch (error) {
			await context.showMessage(
				`${await this.adapter.translate("dm-instance-creategroup-error")}\n${this.getErrorMessage(error)}.`,
			);
		}
		return { refresh: true };
	}

	private async handleEditGroup(deviceId: string, context: ActionContext): Promise<DeviceRefreshResponse<string>> {
		const groupId = parseInt(deviceId.split(".").reverse()[0]);
		const group = this.adapter.Groups?.Groups[groupId];

		if (!group) {
			throw new Error(`Group with ID ${groupId} not found in adapter.`);
		}

		const editGroup = await this.showGroupEditDialog(context, {
			dialogTitle: await this.adapter.getTranslatedObject("dm-device-group-edit-form-title"),
			groupId: groupId,
			groupName: group.Name,
			products: group.Nodes,
		});
		if (editGroup === undefined) {
			return { refresh: "none" };
		}
		try {
			await this.adapter.onChangeGroup(groupId, editGroup.groupName || "", editGroup.products);
		} catch (error) {
			await context.showMessage(
				`${await this.adapter.translate("dm-device-group-edit-error")}\n${this.getErrorMessage(error)}.`,
			);
		}
		return { refresh: "devices" };
	}

	private async handleAddScene(context: ActionContext): Promise<InstanceRefreshResponse> {
		const differentNameCondition = `[${this.adapter.Scenes?.Scenes.filter(scene => scene !== undefined)
			.map(scene => {
				return `"${scene.SceneName.replace(/(\\|")/g, "\\$1")}"`;
			})
			.join(",")}]`;
		const newSceneName = await this.showRenameForm(
			context,
			await this.adapter.getTranslatedObject("dm-instance-createscene-form-title"),
			await this.adapter.getTranslatedObject("dm-instance-createscene-form-label"),
			"",
			`data.name !== undefined && data.name.trim() !== ''${differentNameCondition === "" ? "" : ` && !${differentNameCondition}.includes(data.name)`}`,
			differentNameCondition === ""
				? undefined
				: await this.adapter.translate("dm-instance-createscene-form-unique-name-condition"),
		);
		if (newSceneName !== undefined) {
			let dlg: ProgressDialog | undefined;
			try {
				dlg = await context.openProgress("Add scene", {
					indeterminate: true,
					label: await this.adapter.getTranslatedObject("dm-instance-createscene-progress-initialization"),
				});
				const failedNodes = await this.adapter.onNewSceneInitialize();

				// Close dialog
				await dlg?.close();
				dlg = undefined;

				const confirmationDialog = await context.showConfirmation(
					failedNodes.length === 0
						? await this.adapter.getTranslatedObject("dm-instance-createscene-progress-use-remote")
						: await this.adapter.getTranslatedObject(
								"dm-instance-createscene-progress-use-remote-with-failed-nodes",
								{ failedNodes: failedNodes.join(", ") },
							),
				);
				if (!confirmationDialog) {
					await this.adapter.onNewSceneCancel();
				} else {
					await this.adapter.onNewSceneSave(newSceneName);
					return { refresh: true };
				}
			} catch (error) {
				await dlg?.close();
				dlg = undefined;

				await context.showMessage(
					`${await this.adapter.translate("dm-instance-createscene-error")}\n${this.getErrorMessage(error)}.`,
				);
				return { refresh: true };
			}
		}
		return { refresh: false };
	}

	private async handleGroupDelete(deviceId: string, context: ActionContext): Promise<DeviceRefreshResponse<string>> {
		const groupId = parseInt(deviceId.split(".").reverse()[0]);
		const confirmationDialog = await context.showConfirmation(
			await this.adapter.getTranslatedObject("dm-device-group-delete-confirm", { groupId: groupId.toString() }),
		);
		if (confirmationDialog) {
			try {
				await this.adapter.onRemoveGroup(groupId);
			} catch (error) {
				await context.showMessage(
					`${await this.adapter.translate("dm-device-group-delete-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return { refresh: "devices" };
		}
		return { refresh: "none" };
	}

	private async handleSceneDelete(deviceId: string, context: ActionContext): Promise<DeviceRefreshResponse<string>> {
		const sceneId = parseInt(deviceId.split(".").reverse()[0]);
		const confirmationDialog = await context.showConfirmation(
			await this.adapter.getTranslatedObject("dm-device-scene-delete-confirm", { sceneId: sceneId.toString() }),
		);
		if (confirmationDialog) {
			try {
				await this.adapter.onRemoveScene(sceneId);
			} catch (error) {
				await context.showMessage(
					`${await this.adapter.translate("dm-device-scene-delete-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return { refresh: "devices" };
		}
		return { refresh: "none" };
	}

	private async handleSceneRename(deviceId: string, context: ActionContext): Promise<DeviceRefreshResponse<string>> {
		const sceneId = parseInt(deviceId.split(".").reverse()[0]);
		const scene = this.adapter.Scenes?.Scenes[sceneId];

		if (!scene) {
			throw new Error(`Scene with ID ${sceneId} not found in adapter.`);
		}

		const oldName = scene.SceneName;
		const newName = await this.showRenameForm(
			context,
			await this.adapter.getTranslatedObject("dm-device-scene-rename-form-title"),
			await this.adapter.getTranslatedObject("dm-device-scene-rename-form-label"),
			oldName,
		);
		if (newName !== undefined) {
			try {
				await this.adapter.onRenameScene(sceneId, newName);
			} catch (error) {
				await context.showMessage(
					`${await this.adapter.translate("dm-device-scene-rename-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return { refresh: "devices" };
		}
		return { refresh: "none" };
	}

	private async showRenameForm(
		context: ActionContext,
		title: ioBroker.StringOrTranslated,
		label: ioBroker.StringOrTranslated,
		oldValue: string,
		validator?: string,
		validatorErrorText?: string,
	): Promise<string | undefined> {
		const formSchema: JsonFormSchema = {
			type: "panel",
			items: {
				name: {
					type: "text",
					label: label,
					validator: validator,
					validatorErrorText: validatorErrorText,
				},
			},
		};
		const formData: JsonFormData = {
			name: oldValue,
		};
		const resultForm = (await context.showForm(formSchema, {
			data: formData,
			title: title,
		})) as {
			name: string;
		};
		return resultForm?.name;
	}

	private getErrorMessage(error: any): string {
		let message: string;
		if (error instanceof Error) {
			message = error.message;
		} else if (typeof error === "string") {
			message = error;
		} else {
			message = JSON.stringify(error);
		}
		return message;
	}
}
