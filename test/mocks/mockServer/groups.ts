import { GroupType, NodeVariation, Velocity } from "klf-200-api";

export interface Group {
	GroupID: number;
	Order: number;
	Placement: number;
	Name: string;
	Velocity: Velocity;
	NodeVariation: NodeVariation;
	GroupType: GroupType;
	Nodes: number[];
	Revision: number;
}
