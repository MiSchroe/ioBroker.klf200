import type { ParameterActive } from "klf-200-api";

/**
 * Represents information about a scene node and its parameters.
 */
export interface SceneInformationEntry {
	/**
	 * The unique identifier for the node.
	 */
	NodeID: number;
	/**
	 * The parameter ID, using the ParameterActive type.
	 */
	ParameterID: ParameterActive;
	/**
	 * The value assigned to the parameter.
	 */
	ParameterValue: number;
}

/**
 * Represents a scene in the interface.
 */
export interface Scene {
	/**
	 * The unique identifier for the scene.
	 */
	SceneID: number;
	/**
	 * The name of the scene.
	 */
	Name: string;
	/**
	 * An array of scene nodes and their parameters.
	 */
	Nodes: SceneInformationEntry[];
}
