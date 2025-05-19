/**
 * Base interface for all KLF200 messages.
 */
export interface Klf200Message {
	/**
	 * The command of the message.
	 */
	readonly command: string;
}
