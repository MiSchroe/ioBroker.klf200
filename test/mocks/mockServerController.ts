import { type ChildProcess, fork } from "child_process";
import { randomUUID } from "crypto";
import debugModule from "debug";
import deepEqual from "deep-eql";
import { readFileSync } from "fs";
import { Connection, type IConnection } from "klf-200-api";
import { join } from "path";
import { timeout } from "promise-timeout";
import type { ConnectionOptions } from "tls";
import { type AcknowledgeMessage, type Command, type CommandWithGuid, KillCommand } from "./mockServer/commands.js";

const debug = debugModule(`mockServerController:client`);

export class MockServerController {
	serverProcess: ChildProcess;

	private constructor() {
		this.serverProcess = fork(join(__dirname, "mockServer/mockServer")); //, { stdio: "ignore" });
	}

	static async createMockServer(): Promise<MockServerController> {
		const mockServer = new MockServerController();
		await new Promise<void>(resolve => {
			const onMessage = function (message: string | number | bigint | boolean | object): void {
				if (message === "ready") {
					debug("Ready message received from child process.");
					mockServer.serverProcess.off("message", onMessage);
					resolve();
				}
			};
			mockServer.serverProcess.on("message", message => {
				onMessage(message);
			});
		});
		return await Promise.resolve(mockServer);
	}

	static getMockServerConnectionOptions(): ConnectionOptions {
		return {
			rejectUnauthorized: true,
			requestCert: true,
			ca: readFileSync(join(__dirname, "mockServer", "ca-crt.pem")),
			key: readFileSync(join(__dirname, "mockServer", "client1-key.pem")),
			cert: readFileSync(join(__dirname, "mockServer", "client1-crt.pem")),
		};
	}

	static createMockServerConnect(): IConnection {
		return new Connection("localhost", MockServerController.getMockServerConnectionOptions());
	}

	public async sendCommand(command: Command): Promise<void> {
		const commandWithGuid: CommandWithGuid = { ...command, CommandGuid: randomUUID() };
		await timeout(
			new Promise<void>((resolve, reject) => {
				const onMessage = function (this: ChildProcess, message: AcknowledgeMessage): void {
					debug(`In sendCommand onMessage handler. message: ${JSON.stringify(message)}`);
					if (deepEqual(commandWithGuid.CommandGuid, message.originalCommandGuid)) {
						this.off("message", onMessage);
						switch (message.messageType) {
							case "ERR":
								reject(new Error(message.errorMessage));
								break;

							case "ACK":
								resolve();
								break;

							default:
								break;
						}
					}
				};
				this.serverProcess.on("message", onMessage);
				this.serverProcess.send(commandWithGuid);
			}),
			10000,
		);
	}

	async [Symbol.asyncDispose](): Promise<void> {
		debug(`In Symbol.asyncDispose, connected: ${this.serverProcess?.connected}.`);
		if (this.serverProcess?.connected) {
			try {
				const waitOnClosePromise = new Promise<void>(resolve => {
					this.serverProcess.on("close", () => {
						debug("close event on server process");
						resolve();
					});
				});
				debug("Before Kill command");
				await this.sendCommand(KillCommand);
				debug("After Kill command");
				return await waitOnClosePromise;
			} catch (e) {
				debug(`Exception occurred in Symbol.asyncDispose: ${typeof e === "string" ? e : JSON.stringify(e)}`);
			} finally {
				debug("In finally in Symbol.asyncDispose.");
				if (this.serverProcess?.connected) {
					this.serverProcess?.disconnect();
					debug("After disconnect");
				}
				this.serverProcess?.kill();
				debug("After process kill");
				this.serverProcess?.unref();
				debug("After unref()");
			}
		} else {
			return await Promise.resolve();
		}
	}
}
