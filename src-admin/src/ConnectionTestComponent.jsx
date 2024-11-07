import React from "react";
import PropTypes from "prop-types";

import { Button } from "@mui/material";

// important to make from package and not from some children.
// invalid
// import ConfigGeneric from '@iobroker/json-config/ConfigGeneric';
// valid
import { ConfigGeneric } from "@iobroker/json-config";
import ConnectionTestResultTableComponent from "./ConnectionTestResultTableComponent";
import { hostname } from "os";

const styles = {
	button: {
		minWidth: 150,
	},
	table: {
		minWidth: 650,
	},
};

class ConnectionTestComponent extends ConfigGeneric {
	constructor(props) {
		super(props);

		this.state = {
			alive: false,
			testRunning: false,
			testResults: [],
		};
	}

	componentDidMount() {
		super.componentDidMount();

		this.props.socket
			.getState(`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`)
			.then(async (state) => {
				if (state && state.val !== undefined) {
					this.setState({ alive: state.val });
				} else {
					this.setState({ alive: false });
				}

				const testRunning = await this.props.socket.getState(
					`${this.props.adapterName}.${this.props.instance}.TestConnection.running`,
				);
				if (testRunning && testRunning.val === true) {
					this.setState({ testRunning: true });

					const testResults = await this.props.socket.getState(
						`${this.props.adapterName}.${this.props.instance}.TestConnection.testResults`,
					);
					if (testResults && testResults.val !== undefined) {
						this.setState({ testResults: JSON.parse(testResults.val || "[]") });
					}
				} else {
					this.setState({ testRunning: false });
					this.props.socket.setState(
						`${this.props.adapterName}.${this.props.instance}.TestConnection.testResults`,
						"[]",
						true,
					);
				}

				await this.props.socket.subscribeState(
					`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`,
					this.onAliveChanged,
				);

				await this.props.socket.subscribeState(
					`${this.props.adapterName}.${this.props.instance}.TestConnection.*`,
					this.onChangedState,
				);
			});
	}

	componentWillUnmount() {
		super.componentWillUnmount();

		this.props.socket.unsubscribeState(
			`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`,
			this.onAliveChanged,
		);
		this.props.socket.unsubscribeState(
			`${this.props.adapterName}.${this.props.instance}.TestConnection.*`,
			this.onChangedState,
		);
	}

	onAliveChanged = (id, state) => {
		const alive = state ? state.val : false;
		if (alive !== this.state.alive) {
			this.setState({ alive: alive });
		}
	};

	onChangedState = (id, state) => {
		if (id.endsWith(".running")) {
			const testRunning = state ? state.val : false;
			if (testRunning !== this.state.testRunning) {
				this.setState({ testRunning: testRunning });
			}
		} else if (id.endsWith(".testResults")) {
			const testResults = state ? JSON.parse(state.val || "[]") : [];
			this.setState({ testResults: testResults });
		}
	};

	onConnectionTestProgress(data, sourceInstance, messageType) {
		if (messageType === "ConnectionTestProgress") {
			this.setState({ testResults: data });
		}
	}

	testConnectionHandler = async () => {
		try {
			const message = {
				command: "ConnectionTest",
				hostname: this.props.data.host,
				password: await this.props.socket.encrypt(this.props.data.password),
			};
			// Set the advanced SSL configuration if enabled
			if (this.props.data.advancedSSLConfiguration) {
				message.advancedSSLConfiguration = {
					sslFingerprint: this.props.data.SSLFingerprint,
					sslPublicKey: this.props.data.SSLPublicKey,
				};
			}

			const connectionTestResult = await this.props.socket.sendTo(
				`${this.props.adapterName}.${this.props.instance}`,
				message.command,
				message,
			);

			this.setState({ testResults: connectionTestResult });
		} finally {
		}
	};

	renderItem(error, disabled, defaultValue) {
		return (
			<>
				<Button
					style={styles.button}
					color="secondary"
					variant="contained"
					disabled={!this.state.alive || this.state.testRunning}
					onClick={this.testConnectionHandler}
				>
					Test connection
				</Button>
				{this.state.testRunning || this.state.testResults.length > 0 ? (
					<ConnectionTestResultTableComponent
						socket={this.props.socket}
						themeType={this.state.themeType}
						themeName={this.state.themeName}
						data={this.state}
						onError={() => {}}
						schema={{
							name: "ConfigCustomKlf200Set/Components/ConnectionTestResultTableComponent",
							type: "custom",
						}}
					></ConnectionTestResultTableComponent>
				) : null}
			</>
		);
	}
}

ConnectionTestComponent.propTypes = {
	socket: PropTypes.object.isRequired,
	themeType: PropTypes.string,
	themeName: PropTypes.string,
	style: PropTypes.object,
	data: PropTypes.object.isRequired,
	attr: PropTypes.string,
	schema: PropTypes.object,
	onError: PropTypes.func,
	onChange: PropTypes.func,
};

export default ConnectionTestComponent;
