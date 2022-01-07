"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertErrorToString = exports.ArrayCount = void 0;
function ArrayCount(arr) {
    return arr
        .map((element) => (element !== null && element !== undefined ? 1 : 0))
        .reduce((previousValue, currentValue) => previousValue + currentValue, 0);
}
exports.ArrayCount = ArrayCount;
function convertErrorToString(e) {
    let result = "";
    if (typeof e === "string") {
        result = e;
    }
    else if (e instanceof Error) {
        result = e.toString();
    }
    return result;
}
exports.convertErrorToString = convertErrorToString;
//# sourceMappingURL=utils.js.map