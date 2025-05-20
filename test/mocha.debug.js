/* eslint-disable @typescript-eslint/no-var-requires */
/*
    In case we need to debug our tests
    we will substitute the original sendFrameAsync
    with a debug version to work around timeout issues.
*/

import { Connection } from "klf-200-api";
import sinon from "sinon";

let sendFrameAsyncStub;

export const mochaHooks = {
	beforeAll() {
		console.log("mochaHooks.beforeAll() called");
		sendFrameAsyncStub = sinon.stub(Connection.prototype, "sendFrameAsync");
		sendFrameAsyncStub.callsFake(frame => {
			console.log(`In stubbed sendFrameAsync: ${JSON.stringify(frame)}`);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			return sendFrameAsyncStub.wrappedMethod(frame, Number.MAX_SAFE_INTEGER);
		});
	},
	afterAll() {
		console.log("mochaHooks.afterAll() called");
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		sendFrameAsyncStub.restore();
	},
};
