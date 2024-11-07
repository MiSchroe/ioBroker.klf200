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
				if (state && state.val) {
					this.setState({
						alive: state.val,
					});
				} else {
					this.setState({
						alive: false,
					});
				}

				await this.props.socket.subscribeState(
					`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`,
					this.onAliveChanged,
				);
			});
	}

	componentWillUnmount() {
		super.componentWillUnmount();

		this.props.socket.unsubscribeState(
			`system.adapter.${this.props.adapterName}.${this.props.instance}.alive`,
			this.onAliveChanged,
		);
	}

	onAliveChanged = (id, state) => {
		const alive = state ? state.val : false;
		if (alive !== this.state.alive) {
			this.setState({ alive: alive });
		}
	};

	onConnectionTestProgress(data, sourceInstance, messageType) {
		if (messageType === "ConnectionTestProgress") {
			this.setState({ testResults: data });
		}
	}

	testConnectionHandler = () => {
		this.setState({ testRunning: true }, async () => {
			try {
				// const secret = this.props.socket.systemConfig?.native?.secret || "Zgfr56gFe87jJOM";
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

				// Register for ConnectionTest messages
				await this.props.socket.subscribeOnInstance(
					`${this.props.adapterName}.${this.props.instance}`,
					"ConnectionTestProgress",
					undefined,
					this.onConnectionTestProgress,
				);

				const connectionTestResult = await this.props.socket.sendTo(
					`${this.props.adapterName}.${this.props.instance}`,
					message.command,
					message,
				);

				this.setState({ testResults: connectionTestResult });
			} finally {
				this.setState({ testRunning: false });
				await this.props.socket.unsubscribeFromInstance(
					`${this.props.adapterName}.${this.props.instance}`,
					"ConnectionTestProgress",
					this.onConnectionTestProgress,
				);
			}
		});
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
