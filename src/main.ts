/*
 * Created with @iobroker/create-adapter v1.16.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import type * as utils from "@iobroker/adapter-core";
import { Klf200 } from "./klf200Adapter";

if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Klf200(options);
} else {
	// otherwise start the instance directly
	(() => new Klf200())();
}
