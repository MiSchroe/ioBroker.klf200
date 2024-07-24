import { lookup } from "dns/promises";
import { Connection } from "klf-200-api";
import * as ping from "net-ping";
import { connect, ConnectionOptions, TLSSocket } from "tls";

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
	): Promise<ConnectionTestResult[]>;
}

export class ConnectionTest implements IConnectionTest {
	async resolveName(hostname: string): Promise<string> {
		const result = await lookup(hostname, { all: false, verbatim: false });
		return result.address;
	}

	async ping(ipadress: string): Promise<number> {
		const session = ping.createSession({ packetSize: 64 });
		try {
			return new Promise<number>((resolve, reject) => {
				session.pingHost(ipadress, (err, _target, sent, rcvd) => {
					if (err) {
						session.close();
						reject(err);
					} else {
						session.close();
						resolve(rcvd.valueOf() - sent.valueOf());
					}
				});
			});
		} catch (error) {
			session.close();
			throw error;
		}
	}

	async connectTlsSocket(hostname: string, port: number, connectionOptions?: ConnectionOptions): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			let sckt: TLSSocket | undefined;
			try {
				sckt = connect(port, hostname, connectionOptions, () => {
					if (sckt?.authorized) {
						sckt?.destroy();
						sckt = undefined;
						resolve();
					} else {
						reject(sckt?.authorizationError);
						sckt = undefined;
					}
				});
				sckt.on("error", (error) => {
					reject(error);
				});
			} catch (error) {
				sckt?.destroy();
				sckt = undefined;
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
		progressCallback?: (progress: ConnectionTestResult[]) => void,
	): Promise<ConnectionTestResult[]> {
		const result: ConnectionTestResult[] = [
			{
				stepOrder: 1,
				stepName: "Name lookup",
				run: false,
			},
			{
				stepOrder: 2,
				stepName: "Ping",
				run: false,
			},
			{
				stepOrder: 3,
				stepName: "Connection",
				run: false,
			},
			{
				stepOrder: 4,
				stepName: "Login",
				run: false,
			},
		];

		const callProgressCallback = function (): void {
			if (progressCallback) {
				progressCallback(result);
			}
		};

		// Step 1: Name lookup
		try {
			const ipadress = await this.resolveName(hostname);
			result[0] = {
				...result[0],
				run: true,
				success: true,
				message: `Hostname ${hostname} resolves to IP address ${ipadress}.`,
				result: ipadress,
			};
			callProgressCallback();

			// Step 2: Ping
			try {
				const ms = await this.ping(ipadress);
				result[1] = {
					...result[1],
					run: true,
					success: true,
					message: `Ping was successful after ${ms} milliseconds.`,
					result: ms,
				};
				callProgressCallback();

				// Step 3: TLS connection
				try {
					await this.connectTlsSocket(hostname, 51200, connectionOptions);
					result[2] = {
						...result[2],
						run: true,
						success: true,
						message: `Secure connection successful.`,
					};
					callProgressCallback();

					// Step 4: Login
					try {
						await this.login(hostname, password, connectionOptions);
						result[3] = {
							...result[3],
							run: true,
							success: true,
							message: `Login successful.`,
						};
					} catch (error) {
						result[3] = {
							...result[3],
							run: true,
							success: false,
							message: `Login failed: ${(error as Error).message}`,
							result: error as Error,
						};
					}
				} catch (error) {
					result[2] = {
						...result[2],
						run: true,
						success: false,
						message: `Can't establish a secure connection: ${(error as Error).message}`,
						result: error as Error,
					};
				}
			} catch (error) {
				result[1] = {
					...result[1],
					run: true,
					success: false,
					message: `Can't ping IP address ${ipadress}: ${(error as Error).message}`,
					result: error as Error,
				};
			}
		} catch (error) {
			result[0] = {
				...result[0],
				run: true,
				success: false,
				message: `Can't resolve hostname ${hostname} to an IP address.`,
				result: error as Error,
			};
		}

		return result;
	}
}
