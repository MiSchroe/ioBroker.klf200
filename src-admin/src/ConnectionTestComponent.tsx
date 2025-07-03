import React, { useState, useEffect } from "react";

import { Button } from "@mui/material";

import ConnectionTestResultTableComponent from "./ConnectionTestResultTableComponent";
import { I18n } from "@iobroker/adapter-react-v5";
import { type ConfigGenericProps } from "@iobroker/json-config";

const styles = {
	button: {
		minWidth: 150,
	},
};

export interface ConfigurationData {
	host: string;
	password: string;
	advancedSSLConfiguration?: boolean;
	SSLFingerprint?: string;
	SSLPublicKey?: string;
}

export interface ConnectionTestComponentProps extends ConfigGenericProps {
	data: ConfigurationData;
}

export interface ConnectionTestMessage {
	/** The command for the connection test message. */
	command: "ConnectionTest";
	/** The hostname to connect to. */
	hostname: string;
	/** The password to use for logging in. */
	password: string;
	/** The advanced SSL configuration. */
	advancedSSLConfiguration?: {
		sslFingerprint?: string;
		sslPublicKey?: string;
	};
}

const ConnectionTestComponent: React.FC<ConnectionTestComponentProps> = ({ oContext, data }) => {
	const [alive, setAlive] = useState(false);
	const [testRunning, setTestRunning] = useState(false);
	const [testResults, setTestResults] = useState([]);

	useEffect(() => {
		const onAliveChanged = (_id: string, state: ioBroker.State | null | undefined): void => {
			const alive = state ? (state.val as boolean) : false;
			setAlive(alive);
		};

		const getAliveState = async (): Promise<void> => {
			const stateAlive = await oContext.socket.getState(
				`system.adapter.${oContext.adapterName}.${oContext.instance}.alive`,
			);

			if (stateAlive && stateAlive.val !== undefined) {
				setAlive(stateAlive.val as boolean);
			} else {
				setAlive(false);
			}

			await oContext.socket.subscribeState(
				`system.adapter.${oContext.adapterName}.${oContext.instance}.alive`,
				onAliveChanged,
			);
		};
		getAliveState().catch(console.error);

		// Return a cleanup function to unsubscribe from events
		return () => {
			// Unsubscribe from events here
			oContext.socket.unsubscribeState(
				`system.adapter.${oContext.adapterName}.${oContext.instance}.alive`,
				onAliveChanged,
			);
		};
	}, []);

	useEffect(() => {
		const onChangedState = (id: string, state: ioBroker.State | null | undefined): void => {
			if (id.endsWith(".running")) {
				const testRunning = state ? (state.val as boolean) : false;
				setTestRunning(testRunning);
			} else if (id.endsWith(".testResults")) {
				const testResults = state ? JSON.parse((state.val as string) || "[]") : [];
				setTestResults(testResults);
			}
		};

		const getRunningState = async (): Promise<void> => {
			const stateTestRunning = await oContext.socket.getState(
				`${oContext.adapterName}.${oContext.instance}.TestConnection.running`,
			);

			if (stateTestRunning && stateTestRunning.val === true) {
				setTestRunning(stateTestRunning.val);

				const stateTestResults = await oContext.socket.getState(
					`${oContext.adapterName}.${oContext.instance}.TestConnection.testResults`,
				);

				if (stateTestResults && stateTestResults.val !== undefined) {
					setTestResults(JSON.parse((stateTestResults.val as string) || "[]"));
				}
			} else {
				setTestRunning(false);

				await oContext.socket.setState(
					`${oContext.adapterName}.${oContext.instance}.TestConnection.testResults`,
					"[]",
					true,
				);
			}

			await oContext.socket.subscribeState(
				`${oContext.adapterName}.${oContext.instance}.TestConnection.*`,
				onChangedState,
			);
		};
		getRunningState().catch(console.error);

		// Return a cleanup function to unsubscribe from events
		return () => {
			// Unsubscribe from events here
			oContext.socket.unsubscribeState(
				`${oContext.adapterName}.${oContext.instance}.TestConnection.*`,
				onChangedState,
			);
		};
	}, []);

	const testConnectionHandler = async (): Promise<void> => {
		const message: ConnectionTestMessage = {
			command: "ConnectionTest",
			hostname: data.host,
			password: await oContext.socket.encrypt(data.password),
		};

		// Set the advanced SSL configuration if enabled
		if (data.advancedSSLConfiguration) {
			message.advancedSSLConfiguration = {
				sslFingerprint: data.SSLFingerprint,
				sslPublicKey: data.SSLPublicKey,
			};
		}

		const connectionTestResult = await oContext.socket.sendTo(
			`${oContext.adapterName}.${oContext.instance}`,
			message.command,
			message,
		);

		setTestResults(connectionTestResult);
	};

	return (
		<React.Fragment>
			<Button
				style={styles.button}
				color="secondary"
				variant="contained"
				disabled={!alive || testRunning}
				onClick={testConnectionHandler}
			>
				{I18n.t("custom_klf200_test_connection_button")}
			</Button>
			{!alive && <p>{I18n.t("custom_klf200_test_connection_not_alive_hint")}</p>}
			{(testRunning || testResults.length > 0) && (
				<ConnectionTestResultTableComponent testResults={testResults} />
			)}
		</React.Fragment>
	);
};

export default ConnectionTestComponent;
