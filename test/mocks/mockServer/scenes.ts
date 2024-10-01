import { ParameterActive } from "klf-200-api";

export interface SceneInformationEntry {
	NodeID: number;
	ParameterID: ParameterActive;
	ParameterValue: number;
}

export interface Scene {
	SceneID: number;
	Name: string;
	Nodes: SceneInformationEntry[];
}
