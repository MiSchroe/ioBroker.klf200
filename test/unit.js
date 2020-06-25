"use strict";

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable prettier/prettier */
const path = require("path");
const { tests, utils } = require("@iobroker/testing");
const { setup } = require("../build/setup");
const { promisify } = require("util");

const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const chaiAsPromised = require("chai-as-promised");
const { should, use } = require("chai");

should();
use(sinonChai);
use(chaiAsPromised);

class MockConnect {}
MockConnect.prototype.loginAsync = sinon.stub().resolves();
MockConnect.prototype.logoutAsync = sinon.stub().resolves();
MockConnect.prototype.sendFrameAsync = sinon.stub().resolves();
MockConnect.prototype.on = sinon.stub();
MockConnect.prototype.KLF200SocketProtocol = undefined;

const originalKLF200API = require("klf-200-api");

class MockGateway {}
MockGateway.prototype.getVersionAsync = sinon.stub().resolves({
	SoftwareVersion: {
		CommandVersion: 0,
		MainVersion: 2,
		SubVersion: 0,
		BranchID: 0,
		Build: 71,
		MicroBuild: 0,
		toString: sinon.stub().returns("0.2.0.0.71.0"),
	},
	HardwareVersion: 5,
	ProductGroup: 14,
	ProductType: 3,
});
MockGateway.prototype.getProtocolVersionAsync = sinon.stub().resolves({ MajorVersion: 3, MinorVersion: 14 });
MockGateway.prototype.getStateAsync = sinon.stub().resolves({
	GatewayState: originalKLF200API.GatewayState.GatewayMode_WithActuatorNodes,
	SubState: originalKLF200API.GatewaySubState.Idle,
});
MockGateway.prototype.enableHouseStatusMonitorAsync = sinon.stub().resolves();
MockGateway.prototype.setUTCDateTimeAsync = sinon.stub().resolves();
MockGateway.prototype.setTimeZoneAsync = sinon.stub().resolves();

class MockScenes {}
MockScenes.createScenesAsync = sinon.stub().resolves({ Scenes: [], onRemovedScene: sinon.stub() });

class MockGroups {}
MockGroups.createGroupsAsync = sinon
	.stub()
	.resolves({ Groups: [], onRemovedGroup: sinon.stub(), onChangedGroup: sinon.stub() });

class MockProducts {}
MockProducts.createProductsAsync = sinon
	.stub()
	.resolves({ Products: [], onRemovedProduct: sinon.stub(), onNewProduct: sinon.stub() });

// Run unit tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.unit(path.join(__dirname, ".."), {
	additionalMockedModules: {
		"klf-200-api": {
			Connection: MockConnect,
			ActuatorType: originalKLF200API.ActuatorType,
			GroupType: originalKLF200API.GroupType,
			Gateway: MockGateway,
			Scenes: MockScenes,
			Groups: MockGroups,
			Products: MockProducts,
		},
	},
	defineMockBehavior(database, adapter) {
		// Fake getChannelsOf
		adapter.getChannelsOf.callsFake((parentDevice, callback) =>
			callback(null, [
				{
					_id: `${adapter.namespace}.products.42`,
					type: "channel",
					common: {
						name: "Test window",
					},
					native: {},
				},
			]),
		);
		// Fake deleteChannel
		adapter.deleteChannel.callsFake((parentDevice, channelId, callback) => {
			// Delete sub-objects first
			adapter.getObjectList(
				{
					startKey: `${adapter.namespace}.${parentDevice}.${channelId}`,
					endkey: `${adapter.namespace}.${parentDevice}.${channelId}.\u9999`,
				},
				(err, res) => {
					for (const row of res.rows) {
						adapter.delObject(row.id);
					}

					adapter.delObject(`${parentDevice}.${channelId}`, callback);
				},
			);
		});

		// Promisify additional methods
		for (const method of ["unsubscribeStates", "getChannelsOf", "deleteChannel"]) {
			Object.defineProperty(adapter, `${method}Async`, {
				configurable: true,
				enumerable: true,
				value: promisify(adapter[method]),
				writable: true,
			});
		}

		// Mock some EventEmitter functions
		adapter.getMaxListeners = sinon.stub().returns(100);
		adapter.setMaxListeners = sinon.stub();
	},
});
