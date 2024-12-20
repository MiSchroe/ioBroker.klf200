// this file used only for simulation and not used in end build
import React from "react";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";

import { GenericApp, I18n, Loader, ConfigGeneric, AdminConnection } from "@iobroker/adapter-react-v5";
import { Box, FormControlLabel, Switch } from "@mui/material";

import ConnectionTestComponent from "./ConnectionTestComponent";

const styles = {
	app: (theme) => ({
		backgroundColor: theme.palette.background.default,
		color: theme.palette.text.primary,
		height: "100%",
	}),
	item: {
		padding: 50,
		// width: 400,
	},
};

class App extends GenericApp {
	constructor(props) {
		const extendedProps = { ...props };
		extendedProps.Connection = AdminConnection;
		super(props, extendedProps);

		this.state = {
			theme: this.createTheme(),
			native: {
				host: "localhost",
				password: "velux123",
				enableAutomaticReboot: true,
				automaticRebootCronTime: "0 3 * * *",
				advancedSSLConfiguration: false,
				SSLPublicKey: "",
				SSLFingerprint: "",
			},
			alive: false,
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
				{
					stepOrder: 4,
					stepName: "Login",
					run: false,
				},
			],
		};

		I18n.setLanguage((navigator.language || navigator.userLanguage || "en").substring(0, 2).toLowerCase());
	}

	handleAliveChange = (event) => {
		this.setState({ alive: event.target.checked });
		this.socket.setState(`system.adapter.klf200.${this.props.instance}.alive`, {
			val: event.target.checked,
			ack: true,
		});
	};

	async handleTestConnection(hostname, password, connectionOptions, progressCallback) {
		console.log("handleTestConnection", hostname, password, connectionOptions, progressCallback);
	}

	// onReceiveMessage() {
	// 	super.onReceiveMessage();
	// 	console.log("onReceiveMessage", arguments);
	// }

	render() {
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
							<FormControlLabel
								label="alive"
								control={<Switch checked={this.state.alive} onChange={this.handleAliveChange} />}
							/>
						</div>
						<div style={styles.item}>
							<ConnectionTestComponent
								socket={this.socket}
								themeType={this.state.themeType}
								themeName={this.state.themeName}
								data={this.state.native}
								onError={() => {}}
								schema={{
									name: "ConfigCustomKlf200Set/Components/ConnectionTestComponent",
									type: "custom",
								}}
							/>
						</div>
					</Box>
				</ThemeProvider>
			</StyledEngineProvider>
		);
	}
}

export default App;
