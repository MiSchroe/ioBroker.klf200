import type { Klf200Message } from "./klf200Message.js";

/**
 * Interface for a connection test message.
 */
export interface ConnectionTestMessage extends Klf200Message {
	/** The command for the connection test message. */
	readonly command: "ConnectionTest";
	/** The hostname to connect to. */
	readonly hostname: string;
	/** The password to use for logging in. */
	readonly password: string;
	/** The advanced SSL configuration. */
	readonly advancedSSLConfiguration?: {
		readonly sslFingerprint?: string;
		readonly sslPublicKey?: string;
	};
}
