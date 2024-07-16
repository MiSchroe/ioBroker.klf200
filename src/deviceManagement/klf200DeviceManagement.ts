import {
	ActionContext,
	DeviceInfo,
	DeviceManagement,
	InstanceDetails,
	JsonFormData,
	JsonFormSchema,
	RefreshResponse,
} from "@iobroker/dm-utils";
import { ProgressDialog } from "@iobroker/dm-utils/build/ProgressDialog";
import assert from "assert";
import { ActuatorType } from "klf-200-api";
import { Klf200 } from "../klf200Adapter";

type instanceActionType = "discover" | "addGroup" | "addScene" | "sendToRemote" | "receiveFromRemote";
type productActionType = "deleteProduct" | "renameProduct" | "winkProduct";
type groupActionType = "deleteGroup" | "editGroup";
type sceneActionType = "deleteScene" | "renameScene";
type deviceActionType = productActionType | groupActionType | sceneActionType;

type GroupEditDialogData = {
	dialogTitle: ioBroker.StringOrTranslated;
	groupId?: number;
	groupName?: string;
	products: number[];
};

type GroupEditResultData = Omit<GroupEditDialogData, "dialogTitle">;

export class KLF200DeviceManagement extends DeviceManagement<Klf200> {
	protected override async listDevices(): Promise<DeviceInfo[]> {
		this.adapter.log.debug(`KLF200DeviceManagement: listDevices called.`);
		const devices: DeviceInfo[] = [];

		// Setup products
		if (this.adapter.Products) {
			for (const product of this.adapter.Products.Products) {
				if (product) {
					devices.push({
						id: `products.${product.NodeID}`,
						name: product.Name,
						actions: [
							{
								id: "deleteProduct",
								icon: "fa-solid fa-trash-can",
								description: await this.adapter.getTranslatedObject("dm-device-product-delete"),
								handler: () => {
									return { refresh: false };
								},
							},
							{
								id: "renameProduct",
								icon: "fa-solid fa-pen",
								description: await this.adapter.getTranslatedObject("dm-device-product-rename"),
								handler: () => {
									return { refresh: false };
								},
							},
							{
								id: "winkProduct",
								icon: "fa-solid fa-eye",
								description: await this.adapter.getTranslatedObject("dm-device-product-wink"),
								handler: () => {
									return { refresh: false };
								},
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
						actions: [
							{
								id: "deleteGroup",
								icon: "fa-solid fa-trash-can",
								description: await this.adapter.getTranslatedObject("dm-device-group-delete"),
								handler: () => {
									return { refresh: false };
								},
							},
							{
								id: "editGroup",
								icon: "fa-solid fa-pen",
								description: await this.adapter.getTranslatedObject("dm-device-group-edit"),
								handler: () => {
									return { refresh: false };
								},
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
						actions: [
							{
								id: "deleteScene",
								icon: "fa-solid fa-trash-can",
								description: await this.adapter.getTranslatedObject("dm-device-scene-delete"),
								handler: () => {
									return { refresh: false };
								},
							},
							{
								id: "renameScene",
								icon: "fa-solid fa-pen",
								description: await this.adapter.getTranslatedObject("dm-device-scene-rename"),
								handler: () => {
									return { refresh: false };
								},
							},
						],
					});
				}
			}
		}
		this.adapter.log.debug(`KLF200DeviceManagement: listDevices: Returning ${JSON.stringify(devices)}.`);
		return Promise.resolve(devices);
	}
	protected override async getInstanceInfo(): Promise<InstanceDetails> {
		this.adapter.log.debug(`KLF200DeviceManagement: getInstanceInfo called.`);
		const instanceDetails: InstanceDetails = {
			...(await Promise.resolve(super.getInstanceInfo())),
			apiVersion: "v1",
			actions: [
				{
					id: "discover",
					icon: "fas fa-search",
					title: "",
					description: await this.adapter.getTranslatedObject("dm-instance-discover"),
					handler: () => {
						return { refresh: false };
					},
				},
				{
					id: "addGroup",
					icon: "fas fa-link",
					title: "",
					description: await this.adapter.getTranslatedObject("dm-instance-creategroup"),
					handler: () => {
						return { refresh: false };
					},
				},
				{
					id: "addScene",
					icon: "fas fa-play",
					title: "",
					description: await this.adapter.getTranslatedObject("dm-instance-createscene"),
					handler: () => {
						return { refresh: false };
					},
				},
				// {
				// 	id: "sendToRemote",
				// 	icon: "fas fa-upload",
				// 	title: "",
				// 	description: await this.adapter.getTranslatedObject("dm-instance-sendtoremote"),
				// 	handler: () => {
				// 		return { refresh: false };
				// 	},
				// },
				// {
				// 	id: "receiveFromRemote",
				// 	icon: "fas fa-download",
				// 	title: "",
				// 	description: await this.adapter.getTranslatedObject("dm-instance-receivefromremote"),
				// 	handler: () => {
				// 		return { refresh: false };
				// 	},
				// },
			],
		};
		this.adapter.log.debug(
			`KLF200DeviceManagement: getInstanceInfo: Returning ${JSON.stringify(instanceDetails)}.`,
		);
		return Promise.resolve(instanceDetails);
	}

	// protected override getDeviceDetails(id: string): RetVal<DeviceDetails | null | { error: string }> {}

	protected override async handleInstanceAction(
		actionId: instanceActionType,
		context?: ActionContext,
	): Promise<RefreshResponse> {
		switch (actionId) {
			case "discover":
				return this.handleInstanceDiscover(context);

			case "addGroup":
				return this.handleAddGroup(context);

			case "addScene":
				return this.handleAddScene(context);

			case "sendToRemote":
				return this.handleSendToRemote(context);

			case "receiveFromRemote":
				return this.handleReceiveFromRemote(context);

			default:
				throw new Error(`Instance action ${actionId as string} is unknown.`);
		}
	}
	protected override async handleDeviceAction(
		deviceId: string,
		actionId: deviceActionType,
		context?: ActionContext,
	): Promise<RefreshResponse> {
		switch (actionId) {
			case "deleteProduct":
				return this.handleProductDelete(deviceId, context);

			case "renameProduct":
				return this.handleProductRename(deviceId, context);

			case "winkProduct":
				return this.handleProductWink(deviceId, context);

			case "deleteGroup":
				return this.handleGroupDelete(deviceId, context);

			case "editGroup":
				return this.handleEditGroup(deviceId, context);

			case "deleteScene":
				return this.handleSceneDelete(deviceId, context);

			case "renameScene":
				return this.handleSceneRename(deviceId, context);

			default:
				throw new Error(`Device action ${actionId as string} is unknown.`);
		}
	}

	private async handleInstanceDiscover(context?: ActionContext): Promise<RefreshResponse> {
		// Start discovery
		const progressDialog = await context?.openProgress(
			await this.adapter.translate("dm-instance-discover-progress-title"),
			{ indeterminate: true },
		);
		try {
			try {
				const refresh = await this.adapter.onDiscover();
				// Return the result
				return { refresh: refresh };
			} catch (error) {
				await context?.showMessage(
					`${await this.adapter.translate("dm-instance-discover-progress-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			// Return the result
			return { refresh: true };
		} finally {
			await progressDialog?.close();
		}
	}

	private async handleSendToRemote(context?: ActionContext): Promise<RefreshResponse> {
		assert(context, "handleSendToRemote: Action context shouldn't be null or undefined.");
		await context.showMessage("Not implemented.");
		return { refresh: false };
	}

	private async handleReceiveFromRemote(context?: ActionContext): Promise<RefreshResponse> {
		assert(context, "handleReceiveFromRemote: Action context shouldn't be null or undefined.");
		await context.showMessage("Not implemented.");
		return { refresh: false };
	}

	private async handleProductDelete(deviceId: string, context?: ActionContext): Promise<RefreshResponse> {
		const productId = parseInt(deviceId.split(".").reverse()[0]);
		const confirmationDialog = await context?.showConfirmation(
			await this.adapter.translate("dm-device-product-delete-confirm", { productId: productId.toString() }),
		);
		if (confirmationDialog) {
			try {
				await this.adapter.onRemoveProduct(productId);
			} catch (error) {
				await context?.showMessage(
					`${await this.adapter.translate("dm-device-product-delete-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return Promise.resolve({ refresh: true });
		} else {
			return Promise.resolve({ refresh: false });
		}
	}

	private async handleProductRename(deviceId: string, context?: ActionContext): Promise<RefreshResponse> {
		const productId = parseInt(deviceId.split(".").reverse()[0]);
		const product = this.adapter.Products?.Products[productId];

		if (!product) {
			throw new Error(`Product with ID ${productId} not found in adapter.`);
		}

		const oldName = product.Name;
		assert(context, "handleProductRename: Action context shouldn't be null or undefined.");
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
				await context?.showMessage(
					`${await this.adapter.translate("dm-device-product-rename-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return { refresh: true };
		} else {
			return { refresh: false };
		}
	}

	private async handleProductWink(deviceId: string, context?: ActionContext): Promise<RefreshResponse> {
		const productId = parseInt(deviceId.split(".").reverse()[0]);
		try {
			await this.adapter.onWinkProduct(productId);
		} catch (error) {
			await context?.showMessage(
				`${await this.adapter.translate("dm-device-product-wink-error")}\n${this.getErrorMessage(error)}.`,
			);
		}
		return Promise.resolve({ refresh: false });
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
					label: "ID",
				},
				tableHeaderProductName: {
					type: "staticText",
					label: await this.adapter.getTranslatedObject(
						"dm-device-group-edit-form-tableHeaderProductName-label",
					),
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
			for (const product of this.adapter.Products?.Products) {
				if (!productsByTypeMap.has(product.TypeID)) {
					productsByTypeMap.set(product.TypeID, []);
				}
				productsByTypeMap.get(product.TypeID)?.push(`data.cb_${product.NodeID} === true`);
			}

			// Create the disabled conditions
			const conditionsMap = new Map<ActuatorType, string>();
			for (const actuatorType of productsByTypeMap.keys()) {
				let condition = "";
				for (const otherActuatorType of productsByTypeMap.keys()) {
					if (otherActuatorType === actuatorType) continue; // Skip if it's the same type
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
			for (const product of this.adapter.Products?.Products) {
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
						label: product.Name,
						tooltip: ActuatorType[product.TypeID],
						data: product.TypeID,
						disabled: conditionsMap.get(product.TypeID),
					};
					formData[cbName] = groupEditDialogData.products.includes(product.NodeID);

					if (!productsByTypeMap.has(product.TypeID)) {
						productsByTypeMap.set(product.TypeID, []);
					}
					productsByTypeMap.get(product.TypeID)?.push(cbName);
				}
			}
		}
		const resultFormData = await context.showForm(form, {
			data: formData,
			title: groupEditDialogData.dialogTitle,
		});
		if (resultFormData === undefined) return undefined;

		const result: GroupEditResultData = {
			groupId: groupEditDialogData.groupId,
			groupName: resultFormData.groupName as string,
			products: [],
		};
		if (this.adapter.Products) {
			for (const product of this.adapter.Products?.Products) {
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

	private async handleAddGroup(context?: ActionContext): Promise<RefreshResponse> {
		assert(context, "handleAddGroup: Action context shouldn't be null or undefined.");
		const newGroup = await this.showGroupEditDialog(context, {
			dialogTitle: await this.adapter.getTranslatedObject("dm-instance-creategroup-form-title"),
			products: [],
		});
		if (newGroup === undefined) {
			return { refresh: false };
		} else {
			try {
				await this.adapter.onAddGroup(newGroup.groupName || "", newGroup.products);
			} catch (error) {
				await context?.showMessage(
					`${await this.adapter.translate("dm-instance-creategroup-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return { refresh: true };
		}
	}

	private async handleEditGroup(deviceId: string, context?: ActionContext): Promise<RefreshResponse> {
		const groupId = parseInt(deviceId.split(".").reverse()[0]);
		const group = this.adapter.Groups?.Groups[groupId];

		if (!group) {
			throw new Error(`Group with ID ${groupId} not found in adapter.`);
		}

		assert(context, "handleAddGroup: Action context shouldn't be null or undefined.");

		const editGroup = await this.showGroupEditDialog(context, {
			dialogTitle: await this.adapter.getTranslatedObject("dm-device-group-edit-form-title"),
			groupId: groupId,
			groupName: group.Name,
			products: group.Nodes,
		});
		if (editGroup === undefined) {
			return { refresh: false };
		} else {
			try {
				await this.adapter.onChangeGroup(groupId, editGroup.groupName || "", editGroup.products);
			} catch (error) {
				await context?.showMessage(
					`${await this.adapter.translate("dm-device-group-edit-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return { refresh: true };
		}
	}

	private async handleAddScene(context?: ActionContext): Promise<RefreshResponse> {
		assert(context, "handleAddScene: Action context shouldn't be null or undefined.");
		const differentNameCondition = `[${this.adapter.Scenes?.Scenes.filter((scene) => scene !== undefined)
			.map((scene) => {
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

				await context?.showMessage(
					`${await this.adapter.translate("dm-instance-createscene-error")}\n${this.getErrorMessage(error)}.`,
				);
				return { refresh: true };
			}
		}
		return { refresh: false };
	}

	private async handleGroupDelete(deviceId: string, context?: ActionContext): Promise<RefreshResponse> {
		const groupId = parseInt(deviceId.split(".").reverse()[0]);
		const confirmationDialog = await context?.showConfirmation(
			await this.adapter.getTranslatedObject("dm-device-group-delete-confirm", { groupId: groupId.toString() }),
		);
		if (confirmationDialog) {
			try {
				await this.adapter.onRemoveGroup(groupId);
			} catch (error) {
				await context?.showMessage(
					`${await this.adapter.translate("dm-device-group-delete-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return Promise.resolve({ refresh: true });
		} else {
			return Promise.resolve({ refresh: false });
		}
	}

	private async handleSceneDelete(deviceId: string, context?: ActionContext): Promise<RefreshResponse> {
		const sceneId = parseInt(deviceId.split(".").reverse()[0]);
		const confirmationDialog = await context?.showConfirmation(
			await this.adapter.getTranslatedObject("dm-device-scene-delete-confirm", { sceneId: sceneId.toString() }),
		);
		if (confirmationDialog) {
			try {
				await this.adapter.onRemoveScene(sceneId);
			} catch (error) {
				await context?.showMessage(
					`${await this.adapter.translate("dm-device-scene-delete-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return Promise.resolve({ refresh: true });
		} else {
			return Promise.resolve({ refresh: false });
		}
	}

	private async handleSceneRename(deviceId: string, context?: ActionContext): Promise<RefreshResponse> {
		const sceneId = parseInt(deviceId.split(".").reverse()[0]);
		const scene = this.adapter.Scenes?.Scenes[sceneId];

		if (!scene) {
			throw new Error(`Scene with ID ${sceneId} not found in adapter.`);
		}

		const oldName = scene.SceneName;
		assert(context, "handleSceneRename: Action context shouldn't be null or undefined.");
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
				await context?.showMessage(
					`${await this.adapter.translate("dm-device-scene-rename-error")}\n${this.getErrorMessage(error)}.`,
				);
			}
			return { refresh: true };
		} else {
			return { refresh: false };
		}
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
		})) as { name: string };
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
