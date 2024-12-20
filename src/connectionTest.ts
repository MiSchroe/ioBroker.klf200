import debugModule from "debug";
import { lookup } from "dns/promises";
import { Connection } from "klf-200-api";
import * as ping from "net-ping";
import { connect, ConnectionOptions, TLSSocket } from "tls";
import { Translate } from "./translate";

const debug = debugModule("connectionTest");

export class ConnectionTestResult {
	public constructor(
		public readonly stepOrder: number,
		public readonly stepName: string,
		public readonly run: boolean,
		public readonly success?: boolean,
		public readonly message?: string,
		public readonly result?: Error | string | number,
	) {}
}

export interface IConnectionTest {
	resolveName(hostname: string): Promise<string>;
	ping(ipadress: string): Promise<number>;
	connectTlsSocket(hostname: string, port: number, connectionOptions?: ConnectionOptions): Promise<void>;
	login(hostname: string, password: string, connectionOptions?: ConnectionOptions): Promise<void>;
	runTests(
		hostname: string,
		password: string,
		connectionOptions?: ConnectionOptions,
		progressCallback?: (progress: ConnectionTestResult[]) => Promise<void>,
	): Promise<ConnectionTestResult[]>;
}

export class ConnectionTest implements IConnectionTest {
	constructor(private readonly translation: Translate) {}

	async resolveName(hostname: string): Promise<string> {
		debug(`Resolving name for hostname: ${hostname}`);
		const result = await lookup(hostname, { all: false, verbatim: false });
		debug(`Resolved address: ${result.address}`);
		return result.address;
	}

	async ping(ipadress: string): Promise<number> {
		debug(`Pinging IP address: ${ipadress}`);
		const session = ping.createSession({ packetSize: 64 });
		try {
			return new Promise<number>((resolve, reject) => {
				session.pingHost(ipadress, (err, _target, sent, rcvd) => {
					if (err) {
						debug(`Ping error: ${err.message}`);
						session.close();
						reject(err);
					} else {
						const latency = rcvd.valueOf() - sent.valueOf();
						debug(`Ping successful, latency: ${latency}ms`);
						session.close();
						resolve(latency);
					}
				});
			});
		} catch (error) {
			debug(`Ping exception: ${(error as Error).message}`);
			session.close();
			throw error;
		}
	}

	async connectTlsSocket(hostname: string, port: number, connectionOptions?: ConnectionOptions): Promise<void> {
		debug(`Connecting to TLS socket at ${hostname}:${port}`);
		return new Promise<void>((resolve, reject) => {
			let sckt: TLSSocket | undefined;
			try {
				sckt = connect(port, hostname, connectionOptions, () => {
					if (sckt?.authorized) {
						debug("TLS connection authorized");
						sckt?.destroy();
						sckt = undefined;
						resolve();
					} else {
						debug(`TLS connection authorization error: ${sckt?.authorizationError.message}`);
						reject(sckt?.authorizationError);
						sckt = undefined;
					}
				});
				sckt.on("error", (error: Error) => {
					debug(`TLS connection error: ${error.message}`);
					reject(error);
				});
			} catch (error) {
				debug(`TLS connection exception: ${(error as Error).message}`);
				if (sckt) {
					sckt.destroy();
				}
				reject(error);
			}
		});
	}

	async login(hostname: string, password: string, connectionOptions?: ConnectionOptions): Promise<void> {
		const connection = new Connection(hostname, connectionOptions!);
		try {
			await connection.loginAsync(password);
		} finally {
			await connection.logoutAsync();
		}
	}

	async runTests(
		hostname: string,
		password: string,
		connectionOptions?: ConnectionOptions,
		progressCallback?: (progress: ConnectionTestResult[]) => Promise<void>,
	): Promise<ConnectionTestResult[]> {
		const result: ConnectionTestResult[] = [
			{
				stepOrder: 1,
				stepName: await this.translation.translate("connection-test-step-name-name-lookup"),
				run: false,
			},
			{
				stepOrder: 2,
				stepName: await this.translation.translate("connection-test-step-name-ping"),
				run: false,
			},
			{
				stepOrder: 3,
				stepName: await this.translation.translate("connection-test-step-name-connection"),
				run: false,
			},
			{
				stepOrder: 4,
				stepName: await this.translation.translate("connection-test-step-name-login"),
				run: false,
			},
		];

		const callProgressCallback = async function (): Promise<void> {
			if (progressCallback) {
				await progressCallback(result);
			}
		};

		// Send the progress data back for display
		await callProgressCallback();

		// Step 1: Name lookup
		try {
			const ipaddress = await this.resolveName(hostname);
			result[0] = {
				...result[0],
				run: true,
				success: true,
				message: await this.translation.translate("connection-test-message-name-lookup-success", {
					hostname: hostname,
					ipaddress: ipaddress,
				}),
				result: ipaddress,
			};
			await callProgressCallback();

			// Step 2: Ping
			try {
				const ms = await this.ping(ipaddress);
				result[1] = {
					...result[1],
					run: true,
					success: true,
					// message: `Ping was successful after ${ms} milliseconds.`,
					message: await this.translation.translate("connection-test-message-ping-success", {
						ms: ms.toString(),
					}),
					result: ms,
				};
				await callProgressCallback();

				// Step 3: TLS connection
				try {
					await this.connectTlsSocket(hostname, 51200, connectionOptions);
					result[2] = {
						...result[2],
						run: true,
						success: true,
						message: await this.translation.translate("connection-test-message-connection-success"),
					};
					await callProgressCallback();

					// Step 4: Login
					try {
						await this.login(hostname, password, connectionOptions);
						result[3] = {
							...result[3],
							run: true,
							success: true,
							message: await this.translation.translate("connection-test-message-login-success"),
						};
					} catch (error) {
						result[3] = {
							...result[3],
							run: true,
							success: false,
							message: await this.translation.translate("connection-test-message-login-failure", {
								message: (error as Error).message,
							}),
							result: error as Error,
						};
					}
				} catch (error) {
					result[2] = {
						...result[2],
						run: true,
						success: false,
						message: await this.translation.translate("connection-test-message-connection-failure", {
							message: (error as Error).message,
						}),
						result: error as Error,
					};
				}
			} catch (error) {
				result[1] = {
					...result[1],
					run: true,
					success: false,
					message: await this.translation.translate("connection-test-message-ping-failure", {
						ipaddress: ipaddress,
						message: (error as Error).message,
					}),
					result: error as Error,
				};
			}
		} catch (error) {
			result[0] = {
				...result[0],
				run: true,
				success: false,
				message: await this.translation.translate("connection-test-message-name-lookup-failure", {
					hostname: hostname,
				}),
				result: error as Error,
			};
		}

		return result;
	}
}

