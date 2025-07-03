/*
 * Created with @iobroker/create-adapter v1.16.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import type * as utils from "@iobroker/adapter-core";
import url from "node:url";
import { Klf200 } from "./klf200Adapter.js";

const modulePath = url.fileURLToPath(import.meta.url);
if (process.argv[1] === modulePath) {
	new Klf200({ useFormatDate: true });
}
/**
 * Starts the adapter instance.
 *
 * @param [options] - Optional settings for the adapter.
 * @returns The new adapter instance.
 */
export default function startAdapter(options: Partial<utils.AdapterOptions> | undefined): Klf200 {
	return new Klf200({ ...options, useFormatDate: true });
}
