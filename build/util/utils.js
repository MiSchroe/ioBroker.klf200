"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayCount = void 0;
function ArrayCount(arr) {
    return arr
        .map((element) => (element !== null && element !== undefined ? 1 : 0))
        .reduce((previousValue, currentValue) => previousValue + currentValue, 0);
}
exports.ArrayCount = ArrayCount;
//# sourceMappingURL=utils.js.map