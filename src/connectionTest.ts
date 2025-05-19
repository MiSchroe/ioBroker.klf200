import debugModule from "debug";
import { lookup } from "dns/promises";
import { Connection } from "klf-200-api";
import * as ping from "net-ping";
import { type ConnectionOptions, type TLSSocket, connect } from "tls";
import type { Translate } from "./translate";

const debug = debugModule("connectionTest");

/**
 * Represents the result of a connection test step.
 */
export class ConnectionTestResult {
	/**
	 * Constructor for a ConnectionTestResult.
	 *
	 * @param stepOrder The step number of the test in the order of execution.
	 * @param stepName A short description of the test step.
	 * @param run A boolean indicating whether the test step was run.
	 * @param success A boolean indicating whether the test step was successful.
	 * @param message A string message giving more information about the test result.
	 * @param result An optional result object that can be an Error, a string or a number.
	 */
	public constructor(
		public readonly stepOrder: number,
		public readonly stepName: string,
		public readonly run: boolean,
		public readonly success?: boolean,
		public readonly message?: string,
		public readonly result?: Error | string | number,
	) {}
}

/**
 * Interface for connection test operations.
 */
export interface IConnectionTest {
	/**
	 * Resolves the given hostname to an IP address.
	 *
	 * @param hostname The hostname to resolve.
	 * @returns A promise that resolves to the IP address as a string.
	 */
	resolveName(hostname: string): Promise<string>;

	/**
	 * Pings the given IP address and returns the latency in milliseconds.
	 *
	 * @param ipadress The IP address to ping.
	 * @returns A promise that resolves to the latency in milliseconds.
	 */
	ping(ipadress: string): Promise<number>;
	/**
	 * Establishes a secure connection to the given hostname and port.
	 *
	 * @param hostname The hostname to connect to.
	 * @param port The port to connect to.
	 * @param connectionOptions Optional connection options.
	 * @returns A promise that resolves when the connection is established.
	 */
	connectTlsSocket(hostname: string, port: number, connectionOptions?: ConnectionOptions): Promise<void>;
	/**
	 * Logs in to the given hostname with the given password.
	 *
	 * @param hostname The hostname to log in to.
	 * @param password The password to use for logging in.
	 * @param connectionOptions Optional connection options.
	 * @returns A promise that resolves when the login is successful.
	 */
	login(hostname: string, password: string, connectionOptions?: ConnectionOptions): Promise<void>;
	/**
	 * Runs connection tests for the given hostname and password.
	 *
	 * @param hostname The hostname to test.
	 * @param password The password to use for logging in.
	 * @param connectionOptions Optional connection options.
	 * @param progressCallback Optional callback to receive progress updates.
	 * @returns A promise that resolves to an array of ConnectionTestResult objects.
	 */
	runTests(
		hostname: string,
		password: string,
		connectionOptions?: ConnectionOptions,
		progressCallback?: (progress: ConnectionTestResult[]) => Promise<void>,
	): Promise<ConnectionTestResult[]>;
}

/**
 * Implements connection test operations for KLF-200 devices.
 */
export class ConnectionTest implements IConnectionTest {
	/**
	 * Creates an instance of ConnectionTest.
	 *
	 * @param translation The translation service to use for messages.
	 */
	constructor(private readonly translation: Translate) {}

	/**
	 * Resolves the given hostname to an IP address.
	 *
	 * @param hostname The hostname to resolve.
	 * @returns A promise that resolves to the IP address as a string.
	 */
	async resolveName(hostname: string): Promise<string> {
		debug(`Resolving name for hostname: ${hostname}`);
		const result = await lookup(hostname, { all: false, verbatim: false });
		debug(`Resolved address: ${result.address}`);
		return result.address;
	}

	/**
	 * Pings the given IP address and returns the latency in milliseconds.
	 *
	 * @param ipadress The IP address to ping.
	 * @returns A promise that resolves to the latency in milliseconds.
	 */
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

	/**
	 * Establishes a secure connection to the given hostname and port.
	 *
	 * @param hostname The hostname to connect to.
	 * @param port The port to connect to.
	 * @param connectionOptions Optional connection options.
	 * @returns A promise that resolves when the connection is established.
	 */
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
						reject(sckt?.authorizationError as Error);
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
				reject(error as Error);
			}
		});
	}

	/**
	 * Logs in to the given hostname with the given password.
	 *
	 * @param hostname The hostname to log in to.
	 * @param password The password to use for logging in.
	 * @param connectionOptions Optional connection options.
	 * @returns A promise that resolves when the login is successful.
	 */
	async login(hostname: string, password: string, connectionOptions?: ConnectionOptions): Promise<void> {
		const connection = new Connection(hostname, connectionOptions!);
		try {
			await connection.loginAsync(password);
		} finally {
			await connection.logoutAsync();
		}
	}

	/**
	 * Runs connection tests for the given hostname and password.
	 *
	 * @param hostname The hostname to test.
	 * @param password The password to use for logging in.
	 * @param connectionOptions Optional connection options.
	 * @param progressCallback Optional callback to report progress.
	 * @returns A promise that resolves to an array of ConnectionTestResult objects.
	 */
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
