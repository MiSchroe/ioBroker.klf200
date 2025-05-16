import type { GatewayState, GatewaySubState, SoftwareVersion } from "klf-200-api";

export interface Gateway {
	SoftwareVersion: SoftwareVersion;
	HardwareVersion: number;
	ProductGroup: number;
	ProductType: number;
	ProtocolMajorVersion: number;
	ProtocolMinorVersion: number;
	GatewayState: GatewayState;
	GatewaySubState: GatewaySubState;
	IPAddress: string;
	NetworkMask: string;
	DefaultGateway: string;
	DHCP: boolean;
}
