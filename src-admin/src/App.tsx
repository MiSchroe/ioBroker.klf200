// this file used only for simulation and not used in end build
import React from "react";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";

import {
	GenericApp,
	I18n,
	Loader,
	type IobTheme,
	type GenericAppProps,
	type GenericAppState,
} from "@iobroker/gui-components";
import { Box } from "@mui/material";

import ConnectionTestComponent, { type ConfigurationData } from "./ConnectionTestComponent";

const styles: Record<string, any> = {
	app: (theme: IobTheme): React.CSSProperties => ({
		backgroundColor: theme.palette.background.default,
		color: theme.palette.text.primary,
		height: "100%",
	}),
	item: {
		padding: 50,
		// width: 400,
	},
};

// Beispielhafter Mock-Socket in App.tsx
const mockStateSubscribers: Record<string, ((id: string, state: any) => void)[]> = {};

const mockSocket: any = {
	getState: async (id: string) => {
		if (id.endsWith(".alive")) {
			return await Promise.resolve({ val: true }); // Simuliert: Adapter läuft
		}
		if (id.endsWith(".running")) {
			return await Promise.resolve({ val: false });
		}
		if (id.endsWith(".testResults")) {
			return await Promise.resolve({ val: "[]" });
		}
		return await Promise.resolve(null);
	},
	setState: async (id: string, val: any) => {
		console.log(`[MockSocket] setState: ${id} =`, val);
		return await Promise.resolve();
	},
	subscribeState: async (pattern: string, cb: (id: string, state: any) => void) => {
		mockStateSubscribers[pattern] = mockStateSubscribers[pattern] || [];
		mockStateSubscribers[pattern].push(cb);
		return await Promise.resolve();
	},
	unsubscribeState: async (pattern: string, cb: (id: string, state: any) => void) => {
		if (mockStateSubscribers[pattern]) {
			mockStateSubscribers[pattern] = mockStateSubscribers[pattern].filter(fn => fn !== cb);
		}
		return await Promise.resolve();
	},
	encrypt: async (val: string) => await Promise.resolve(`encrypted_${val}`),
	sendTo: async (target: string, command: string, message: any) => {
		console.log(`[MockSocket] sendTo: ${target} -> ${command}`, message);

		if (command === "ConnectionTest") {
			// Simulierte Testergebnisse nach 1 Sekunde Verzögerung
			await new Promise(resolve => setTimeout(resolve, 1000));
			return [
				{
					stepOrder: 1,
					stepName: "Name lookup",
					run: true,
					success: true,
					message: "Hostname resolves to 192.168.1.100",
					result: "192.168.1.100",
				},
				{
					stepOrder: 2,
					stepName: "Ping",
					run: true,
					success: true,
					message: "Ping successful (12ms)",
					result: 12,
				},
				{
					stepOrder: 3,
					stepName: "Connection",
					run: true,
					success: true,
					message: "Connected via SSL",
					result: true,
				},
				{
					stepOrder: 4,
					stepName: "Login",
					run: true,
					success: true,
					message: "Login successful",
					result: true,
				},
			];
		}
		return null;
	},
};

interface AppState extends GenericAppState {
	native: ConfigurationData;
	testResults: Record<string, any>[];
}
class App extends GenericApp<GenericAppProps, AppState> {
	constructor(props: GenericAppProps) {
		const extendedProps = { ...props };
		super(props, extendedProps);

		this.state = {
			...this.state,
			theme: this.createTheme(),
			native: {
				host: "localhost",
				// file deepcode ignore NoHardcodedPasswords: Only for testing.
				password: "velux123",
				advancedSSLConfiguration: false,
				SSLPublicKey: "",
				SSLFingerprint: "",
			},
			testResults: [
				{
					stepOrder: 1,
					stepName: "Name lookup",
					run: true,
					success: true,
					message: `Hostname localhost resolves to IP address 127.0.0.1.`,
					result: "127.0.0.1",
				},
				{
					stepOrder: 2,
					stepName: "Ping",
					run: true,
					success: true,
					message: `Ping was successful after 42 milliseconds.`,
					result: 42,
				},
				{
					stepOrder: 3,
					stepName: "Connection",
					run: true,
					success: false,
					message: `Can't establish a secure connection: No matching protocol found.`,
					result: new Error("No matching protocol found."),
				},
				{ stepOrder: 4, stepName: "Login", run: false },
			],
		};

		// @ts-expect-error userLanguage could exist
		I18n.setLanguage((navigator.language || navigator.userLanguage || "en").substring(0, 2).toLowerCase());
	}

	// async handleTestConnection(hostname, password, connectionOptions, progressCallback): Promise<void> {
	// 	console.log("handleTestConnection", hostname, password, connectionOptions, progressCallback);
	// }

	// onReceiveMessage() {
	// 	super.onReceiveMessage();
	// 	console.log("onReceiveMessage", arguments);
	// }

	render(): React.JSX.Element {
		if (!this.state.loaded) {
			return (
				<StyledEngineProvider injectFirst>
					<ThemeProvider theme={this.state.theme}>
						<Loader themeType={this.state.themeType} />
					</ThemeProvider>
				</StyledEngineProvider>
			);
		}

		return (
			<StyledEngineProvider injectFirst>
				<ThemeProvider theme={this.state.theme}>
					<Box sx={styles.app}>
						<div style={styles.item}>
							<ConnectionTestComponent
								oContext={{
									adapterName: "klf200",
									socket: mockSocket,
									instance: 0,
									themeType: this.state.theme.palette.mode,
									isFloatComma: true,
									dateFormat: "",
									forceUpdate: () => {},
									systemConfig: {} as ioBroker.SystemConfigCommon,
									theme: this.state.theme,
									_themeName: this.state.themeName,
									onCommandRunning: (_commandRunning: boolean): void => {},
								}}
								alive
								changed={false}
								themeName={this.state.theme.palette.mode}
								common={{} as ioBroker.InstanceCommon}
								data={this.state.native}
								originalData={{}}
								onError={() => {}}
								schema={{
									url: "",
									i18n: true,
									name: "ConfigCustomKlf200Set/Components/ConnectionTestComponent",
									type: "custom",
								}}
								onChange={data => this.setState({ native: data as ConfigurationData })}
							/>
						</div>
					</Box>
				</ThemeProvider>
			</StyledEngineProvider>
		);
	}
}

export default App;
