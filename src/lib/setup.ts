"use strict";

export class setup {
    public static async setupGlobalAsync(adapter: ioBroker.Adapter): Promise<void> {
        // Setup products device
        await adapter.setObjectNotExistsAsync("products", {
            "type": "device", "common": {
                "name": "products"
            },
            "native": {}
        });
        await adapter.setObjectNotExistsAsync("products.productsFound", {
            "type": "state", "common": {
                "name": "Number of products found",
                "role": "value",
                "type": "number",
                "min": 0,
                "def": 0,
                "read": true,
                "write": false,
                "desc": "Number of products connected to the interface"
            },
            "native": {}
        });

        // Setup scenes device
        await adapter.setObjectNotExistsAsync("scenes", {
            "type": "device", "common": {
                "name": "scenes"
            },
            "native": {}
        });
        await adapter.setObjectNotExistsAsync("scenes.scenesFound", {
            "type": "state", "common": {
                "name": "Number of scenes found",
                "role": "value",
                "type": "number",
                "min": 0,
                "def": 0,
                "read": true,
                "write": false,
                "desc": "Number of scenes defined in the interface"
            },
            "native": {}
        });

        // Setup groups device
        await adapter.setObjectNotExistsAsync("groups", {
            "type": "device", "common": {
                "name": "groups"
            },
            "native": {}
        });
        await adapter.setObjectNotExistsAsync("groups.groupsFound", {
            "type": "state", "common": {
                "name": "Number of groups found",
                "role": "value",
                "type": "number",
                "min": 0,
                "def": 0,
                "read": true,
                "write": false,
                "desc": "Number of groups defined in the interface"
            },
            "native": {}
        });
    }
}