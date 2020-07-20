"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromiseQueue = void 0;
class PromiseQueue {
    constructor() {
        this._nextPromise = Promise.resolve();
    }
    push(asyncFunction) {
        this._nextPromise = this._nextPromise.then(asyncFunction, asyncFunction);
        return this;
    }
    async waitAsync() {
        await this._nextPromise;
    }
}
exports.PromiseQueue = PromiseQueue;
//# sourceMappingURL=promiseQueue.js.map