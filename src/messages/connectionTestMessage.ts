import { ConnectionOptions } from "tls";
import { Klf200Message } from "./klf200Message";

export interface ConnectionTestMessage extends Klf200Message {
	readonly command: "ConnectionTest";
	readonly hostname: string;
	readonly password: string;
	readonly connectionOptions?: ConnectionOptions;
}
