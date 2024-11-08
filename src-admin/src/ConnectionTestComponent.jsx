import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import { Button } from "@mui/material";

import ConnectionTestResultTableComponent from "./ConnectionTestResultTableComponent";

const styles = {
	button: {
		minWidth: 150,
	},
	table: {
		minWidth: 650,
	},
};

const ConnectionTestComponent = ({ adapterName, instance, socket, data }) => {
	const [alive, setAlive] = useState(false);
	const [testRunning, setTestRunning] = useState(false);
	const [testResults, setTestResults] = useState([]);

	useEffect(() => {
		const onAliveChanged = (id, state) => {
			const alive = state ? state.val : false;
			setAlive(alive);
		};

		const getAliveState = async () => {
			const stateAlive = await socket.getState(`system.adapter.${adapterName}.${instance}.alive`);

			if (stateAlive && stateAlive.val !== undefined) {
				setAlive(stateAlive.val);
			} else {
				setAlive(false);
			}

			await socket.subscribeState(`system.adapter.${adapterName}.${instance}.alive`, onAliveChanged);
		};
		getAliveState();

		// Return a cleanup function to unsubscribe from events
		return () => {
			// Unsubscribe from events here
			socket.unsubscribeState(`system.adapter.${adapterName}.${instance}.alive`, onAliveChanged);
		};
	}, []);

	useEffect(() => {
		const onChangedState = (id, state) => {
			if (id.endsWith(".running")) {
				const testRunning = state ? state.val : false;
				setTestRunning(testRunning);
			} else if (id.endsWith(".testResults")) {
				const testResults = state ? JSON.parse(state.val || "[]") : [];
				setTestResults(testResults);
			}
		};

		const getRunningState = async () => {
			const stateTestRunning = await socket.getState(`${adapterName}.${instance}.TestConnection.running`);

			if (stateTestRunning && stateTestRunning.val === true) {
				setTestRunning(stateTestRunning.val);

				const stateTestResults = await socket.getState(`${adapterName}.${instance}.TestConnection.testResults`);

				if (stateTestResults && stateTestResults.val !== undefined) {
					setTestResults(JSON.parse(stateTestResults.val || "[]"));
				}
			} else {
				setTestRunning(false);

				socket.setState(`${adapterName}.${instance}.TestConnection.testResults`, "[]", true);
			}

			await socket.subscribeState(`${adapterName}.${instance}.TestConnection.*`, onChangedState);
		};
		getRunningState();

		// Return a cleanup function to unsubscribe from events
		return () => {
			// Unsubscribe from events here
			socket.unsubscribeState(`${adapterName}.${instance}.TestConnection.*`, onChangedState);
		};
	}, []);

	const testConnectionHandler = async () => {
		try {
			const message = {
				command: "ConnectionTest",
				hostname: data.host,
				password: await socket.encrypt(data.password),
			};

			// Set the advanced SSL configuration if enabled
			if (data.advancedSSLConfiguration) {
				message.advancedSSLConfiguration = {
					sslFingerprint: data.SSLFingerprint,
					sslPublicKey: data.SSLPublicKey,
				};
			}

			const connectionTestResult = await socket.sendTo(`${adapterName}.${instance}`, message.command, message);

			setTestResults(connectionTestResult);
		} finally {
		}
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
				Test connection
			</Button>
			{(testRunning || testResults.length > 0) && (
				<ConnectionTestResultTableComponent testResults={testResults} />
			)}
		</React.Fragment>
	);
};

export default ConnectionTestComponent;
