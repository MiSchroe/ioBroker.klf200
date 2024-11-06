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
			native: props.data,
			testResults: [],
		};
	}

	componentDidMount() {
		super.componentDidMount();

		this.props.socket.getState(`system.adapter.klf200.${this.props.instance}.alive`).then(async (state) => {
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
				`system.adapter.klf200.${this.props.instance}.alive`,
				this.onAliveChanged,
			);
		});
	}

	componentWillUnmount() {
		super.componentWillUnmount();

		this.props.socket.unsubscribeState(`system.adapter.klf200.${this.props.instance}.alive`, this.onAliveChanged);
	}

	onAliveChanged = (id, state) => {
		const alive = state ? state.val : false;
		if (alive !== this.state.alive) {
			this.setState({ alive: alive });
		}
	};

	testConnectionHandler = () => {
		this.setState({ testRunning: true }, async () => {
			try {
				const message = {
					command: "ConnectionTest",
					hostname: ConfigGeneric.getValue(this.props.data, "hostname"),
					password: ConfigGeneric.getValue(this.props.data, "password"),
				};
				// Set the connection options if the advanced SSL configuration is enabled
				if (ConfigGeneric.getValue(this.props.data, "advancedSSLConfiguration")) {
					message.connectionOptions = {
						sslFingerprint: ConfigGeneric.getValue(this.props.data, "SSLFingerprint"),
						sslPublicKey: ConfigGeneric.getValue(this.props.data, "SSLPublicKey"),
					};
				}

				await this.props.socket.sendTo(`${this.props.adapterName}.${this.props.instance}`, "command", "test");
			} finally {
				this.setState({ testRunning: false });
			}
		});
	};

	renderItem(error, disabled, defaultValue) {
		const value = ConfigGeneric.getValue(this.props.data, "hostname");

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
