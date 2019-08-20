"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class setup {
    static setupGlobalAsync(adapter) {
        return __awaiter(this, void 0, void 0, function* () {
            // Setup products device
            yield adapter.setObjectNotExistsAsync("products", {
                "type": "device", "common": {
                    "name": "products"
                },
                "native": {}
            });
            yield adapter.setObjectNotExistsAsync("products.productsFound", {
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
            yield adapter.setObjectNotExistsAsync("scenes", {
                "type": "device", "common": {
                    "name": "scenes"
                },
                "native": {}
            });
            yield adapter.setObjectNotExistsAsync("scenes.scenesFound", {
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
            yield adapter.setObjectNotExistsAsync("groups", {
                "type": "device", "common": {
                    "name": "groups"
                },
                "native": {}
            });
            yield adapter.setObjectNotExistsAsync("groups.groupsFound", {
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
        });
    }
}
exports.setup = setup;
