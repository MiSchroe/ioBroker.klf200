import { tests } from "@iobroker/testing";
import { TestHarness } from "@iobroker/testing/build/tests/integration/lib/harness";
import { expect } from "chai";
import { readFileSync } from "fs";
import {
	ActuatorAlias,
	ActuatorType,
	GatewayState,
	NodeOperatingState,
	NodeVariation,
	PowerSaveMode,
	RunStatus,
	StatusReply,
	Velocity,
} from "klf-200-api";
import path from "path";
import { MockServerController } from "./mocks/mockServerController";
import { setupHouseMockup } from "./setupHouse";

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, ".."), {
	allowedExitCodes: [11],

	defineAdditionalTests({ suite }) {
		suite("Regular test without mock server", (getHarness) => {
			let harness: TestHarness;

			before(function () {
				harness = getHarness();
			});

			it("Should start and terminate itself with exit code 11", async function () {
				this.timeout(60_000);
				await expect(harness.startAdapterAndWait(true)).to.be.rejectedWith(Error);
				expect(harness.adapterExit).to.be.equal(11);
			});
		});

		suite("Regular test with mock server no products", (getHarness) => {
			let harness: TestHarness;
			let mockServerController: MockServerController;

			before(async function () {
				this.timeout(60_000);

				harness = getHarness();
				mockServerController = await MockServerController.createMockServer();

				console.log(`Setup configuration for ${harness.adapterName}`);

				// Setup adapter configuration
				await harness.changeAdapterConfig(harness.adapterName, {
					native: {
						host: "localhost",
						// line deepcode ignore NoHardcodedPasswords/test: Dummy password in unit tests.
						password: "velux123",
						enableAutomaticReboot: false,
						advancedSSLConfiguration: true,
						SSLConnectionOptions: {
							rejectUnauthorized: true,
							requestCert: true,
							ca: readFileSync(path.join(__dirname, "mocks/mockServer", "ca-crt.pem"), "utf8"),
							key: readFileSync(path.join(__dirname, "mocks/mockServer", "client1-key.pem"), "utf8"),
							cert: readFileSync(path.join(__dirname, "mocks/mockServer", "client1-crt.pem"), "utf8"),
						},
					},
					protectedNative: [],
					encryptedNative: [],
				});

				// Start adapter
				await harness.startAdapterAndWait(true);
			});

			after(async function () {
				await harness.stopAdapter();
				if (mockServerController) {
					await mockServerController[Symbol.asyncDispose]();
				}
			});

			describe("Simple startup checks", function () {
				describe("No nodes", function () {
					it("Should start without error", function () {
						expect(harness.isAdapterRunning()).to.be.true;
					});

					it("Gateway state should reflect having no products", async function () {
						const sut = await Promise.resolve(
							getState(harness, `${harness.adapterName}.0.gateway.GatewayState`),
						);
						expect(sut).to.have.property("val", GatewayState.GatewayMode_NoActuatorNodes);
						expect(sut).to.have.property("ack", true);
					});

					it("Should have found no groups", async function () {
						const sut = await Promise.resolve(
							getState(harness, `${harness.adapterName}.0.groups.groupsFound`),
						);
						expect(sut).to.have.property("val", 0);
						expect(sut).to.have.property("ack", true);
					});

					it("Should have found no products", async function () {
						const sut = await Promise.resolve(
							getState(harness, `${harness.adapterName}.0.products.productsFound`),
						);
						expect(sut).to.have.property("val", 0);
						expect(sut).to.have.property("ack", true);
					});

					it("Should have found no scenes", async function () {
						const sut = await Promise.resolve(
							getState(harness, `${harness.adapterName}.0.scenes.scenesFound`),
						);
						expect(sut).to.have.property("val", 0);
						expect(sut).to.have.property("ack", true);
					});
				});
			});
		});

		suite("Regular test with mock server one single product", function (getHarness) {
			let harness: TestHarness;
			let mockServerController: MockServerController;

			before(async function () {
				this.timeout(60_000);
				// Debugging:
				// this.timeout(60 * 60_000);

				harness = getHarness();
				mockServerController = await MockServerController.createMockServer();

				// Setup a single mock product
				await mockServerController.sendCommand({
					command: "SetProduct",
					productId: 0,
					product: {
						NodeID: 0,
						Name: "Window 1",
						TypeID: ActuatorType.WindowOpener,
						SubType: 1,
						Order: 0,
						Placement: 0,
						Velocity: Velocity.Default,
						NodeVariation: NodeVariation.Kip,
						PowerSaveMode: PowerSaveMode.LowPowerMode,
						SerialNumber: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]).toString("base64"), // base64 encoded Buffer
						ProductGroup: 0,
						ProductType: 0,
						State: NodeOperatingState.Done,
						CurrentPositionRaw: 0xc800,
						FP1CurrentPositionRaw: 0xf7ff,
						FP2CurrentPositionRaw: 0xf7ff,
						FP3CurrentPositionRaw: 0xf7ff,
						FP4CurrentPositionRaw: 0xf7ff,
						RemainingTime: 0,
						TimeStamp: new Date("2012-01-01T11:13:55.000Z").toISOString(),
						ProductAlias: [new ActuatorAlias(0xd803, 0xba00)],
						RunStatus: RunStatus.ExecutionCompleted,
						StatusReply: StatusReply.Ok,
						TargetPositionRaw: 0xc800,
						FP1TargetPositionRaw: 0xd400,
						FP2TargetPositionRaw: 0xd400,
						FP3TargetPositionRaw: 0xd400,
						FP4TargetPositionRaw: 0xd400,
					},
				});
				await mockServerController.sendCommand({
					command: "SetGateway",
					gateway: {
						GatewayState: GatewayState.GatewayMode_WithActuatorNodes,
					},
				});

				console.log(`Setup configuration for ${harness.adapterName}`);

				// Setup adapter configuration
				await harness.changeAdapterConfig(harness.adapterName, {
					native: {
						host: "localhost",
						// line deepcode ignore NoHardcodedPasswords/test: Dummy password in unit tests.
						password: "velux123",
						enableAutomaticReboot: false,
						advancedSSLConfiguration: true,
						SSLConnectionOptions: {
							rejectUnauthorized: true,
							requestCert: true,
							ca: readFileSync(path.join(__dirname, "mocks/mockServer", "ca-crt.pem"), "utf8"),
							key: readFileSync(path.join(__dirname, "mocks/mockServer", "client1-key.pem"), "utf8"),
							cert: readFileSync(path.join(__dirname, "mocks/mockServer", "client1-crt.pem"), "utf8"),
						},
					},
					protectedNative: [],
					encryptedNative: [],
				});

				// Start adapter
				await harness.startAdapterAndWait(true, {
					SEND_FRAME_TIMEOUT: (3600 * 10).toString(), // 10 hours
				});
			});

			after(async function () {
				await harness.stopAdapter();
				if (mockServerController) {
					await mockServerController[Symbol.asyncDispose]();
				}
			});

			describe("Simple startup checks", function () {
				describe("One node", function () {
					it("Should start without error", function () {
						expect(harness.isAdapterRunning()).to.be.true;
					});

					it("Gateway state should reflect having no products", async function () {
						const sut = await Promise.resolve(
							getState(harness, `${harness.adapterName}.0.gateway.GatewayState`),
						);
						expect(sut).to.have.property("val", GatewayState.GatewayMode_WithActuatorNodes);
						expect(sut).to.have.property("ack", true);
					});

					it("Should have found no groups", async function () {
						const sut = await Promise.resolve(
							getState(harness, `${harness.adapterName}.0.groups.groupsFound`),
						);
						expect(sut).to.have.property("val", 0);
						expect(sut).to.have.property("ack", true);
					});

					it("Should have found one product", async function () {
						const sut = await Promise.resolve(
							getState(harness, `${harness.adapterName}.0.products.productsFound`),
						);
						expect(sut).to.have.property("val", 1);
						expect(sut).to.have.property("ack", true);
					});

					it("Should have found no scenes", async function () {
						const sut = await Promise.resolve(
							getState(harness, `${harness.adapterName}.0.scenes.scenesFound`),
						);
						expect(sut).to.have.property("val", 0);
						expect(sut).to.have.property("ack", true);
					});
				});
			});
		});

		suite(
			"Regular test with mock server and complete household with multiple products, groups and scenes",
			function (getHarness) {
				let harness: TestHarness;
				let mockServerController: MockServerController;

				before(async function () {
					this.timeout(60_000);
					// Debugging:
					// this.timeout(60 * 60_000);

					harness = getHarness();
					mockServerController = await MockServerController.createMockServer();

					// Setup household
					await setupHouseMockup(mockServerController);

					console.log(`Setup configuration for ${harness.adapterName}`);

					// Setup adapter configuration
					await harness.changeAdapterConfig(harness.adapterName, {
						native: {
							host: "localhost",
							// line deepcode ignore NoHardcodedPasswords/test: Dummy password in unit tests.
							password: "velux123",
							enableAutomaticReboot: false,
							advancedSSLConfiguration: true,
							SSLConnectionOptions: {
								rejectUnauthorized: true,
								requestCert: true,
								ca: readFileSync(path.join(__dirname, "mocks/mockServer", "ca-crt.pem"), "utf8"),
								key: readFileSync(path.join(__dirname, "mocks/mockServer", "client1-key.pem"), "utf8"),
								cert: readFileSync(path.join(__dirname, "mocks/mockServer", "client1-crt.pem"), "utf8"),
							},
						},
						protectedNative: [],
						encryptedNative: [],
					});

					// Start adapter
					await harness.startAdapterAndWait(true, {
						SEND_FRAME_TIMEOUT: (3600 * 10).toString(), // 10 hours
					});
				});

				after(async function () {
					await harness.stopAdapter();
					if (mockServerController) {
						await mockServerController[Symbol.asyncDispose]();
					}
				});

				describe("Simple startup checks", function () {
					describe("Complete household", function () {
						it("Should start without error", function () {
							expect(harness.isAdapterRunning()).to.be.true;
						});

						it("Gateway state should reflect having some products", async function () {
							const sut = await Promise.resolve(
								getState(harness, `${harness.adapterName}.0.gateway.GatewayState`),
							);
							expect(sut).to.have.property("val", GatewayState.GatewayMode_WithActuatorNodes);
							expect(sut).to.have.property("ack", true);
						});

						it("Should have found some groups", async function () {
							const sut = await Promise.resolve(
								getState(harness, `${harness.adapterName}.0.groups.groupsFound`),
							);
							expect(sut).to.have.property("val", 2);
							expect(sut).to.have.property("ack", true);
						});

						it("Should have found some products", async function () {
							const sut = await Promise.resolve(
								getState(harness, `${harness.adapterName}.0.products.productsFound`),
							);
							expect(sut).to.have.property("val", 4);
							expect(sut).to.have.property("ack", true);
						});

						it("Should have found some scenes", async function () {
							const sut = await Promise.resolve(
								getState(harness, `${harness.adapterName}.0.scenes.scenesFound`),
							);
							expect(sut).to.have.property("val", 2);
							expect(sut).to.have.property("ack", true);
						});

						describe("Products", function () {
							for (let index = 0; index < 4; index++) {
								it(`Should have runStatus of ExecutionCompleted at product ${index}`, async function () {
									const sut = await Promise.resolve(
										getState(harness, `${harness.adapterName}.0.products.${index}.runStatus`),
									);
									expect(sut).to.have.property("val", RunStatus.ExecutionCompleted);
									expect(sut).to.have.property("ack", true);
								});

								it(`Should have statusReply of OK at product ${index}`, async function () {
									const sut = await Promise.resolve(
										getState(harness, `${harness.adapterName}.0.products.${index}.statusReply`),
									);
									expect(sut).to.have.property("val", StatusReply.Ok);
									expect(sut).to.have.property("ack", true);
								});

								it(`Should have a limitationMPMinRaw state at product ${index}`, async function () {
									const sut = await Promise.resolve(
										getState(
											harness,
											`${harness.adapterName}.0.products.${index}.limitationMPMinRaw`,
										),
									);
									expect(sut).to.have.property("val");
									expect(sut).to.have.property("ack", true);
								});

								it(`Shouldn't have a limitationFP1MinRaw state at product ${index}`, async function () {
									const sut = await Promise.resolve(
										getState(
											harness,
											`${harness.adapterName}.0.products.${index}.limitationFP1MinRaw`,
										),
									);
									expect(sut).to.be.null;
								});
							}
						});
					});
				});
			},
		);
	},
});

/* Helper functions */
async function getState(harness: TestHarness, stateName: string): Promise<ioBroker.State> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
	return (await Promise.resolve(harness.states.getStateAsync(stateName))) as ioBroker.State;
}
