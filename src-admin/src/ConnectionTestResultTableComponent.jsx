import React from "react";
import PropTypes from "prop-types";

import {
	Table,
	TableHead,
	TableBody,
	TableContainer,
	TableRow,
	TableCell,
	useMediaQuery,
	useTheme,
	Stack,
	Divider,
	Box,
	Grid,
} from "@mui/material";

// important to make from package and not from some children.
// invalid
// import ConfigGeneric from '@iobroker/json-config/ConfigGeneric';
// valid
import { ConfigGeneric } from "@iobroker/json-config";

const styles = {
	button: {
		minWidth: 150,
	},
	table: {
		minWidth: 650,
	},
};

const withMediaQuery =
	(...args) =>
	(Component) =>
	(props) => {
		const theme = useTheme();
		const mediaQuery = useMediaQuery(theme.breakpoints.up(...args));
		return <Component mediaQuery={mediaQuery} {...props} />;
	};

class ConnectionTestResultTableComponent extends ConfigGeneric {
	renderItem(error, disabled, defaultValue) {
		const matches = this.props.mediaQuery;

		if (matches) {
			return (
				<TableContainer>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell align="left" size="small">
									Status
								</TableCell>
								<TableCell align="left">Step name</TableCell>
								<TableCell align="left">Result</TableCell>
								<TableCell align="left">Message</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{this.props.data.testResults.map((testResult) => (
								<TableRow
									key={testResult.stepOrder}
									sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
									hover={true}
								>
									<TableCell align="center" size="small">
										{testResult.run ? (testResult.success ? "✅" : "❌") : ""}
									</TableCell>
									<TableCell align="left">{testResult.stepName}</TableCell>
									<TableCell align={typeof testResult.result === "number" ? "right" : "left"}>
										{String(testResult.result ?? "")}
									</TableCell>
									<TableCell align="left">{testResult.message ?? ""}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			);
		} else {
			return (
				<Stack
					divider={<Divider orientation="horizontal" flexItem />}
					spacing={1}
					sx={{ marginTop: 1, overflow: "auto", height: "100%" }}
				>
					{this.props.data.testResults.map((testResult) => (
						<Grid container key={testResult.stepOrder}>
							<Grid
								item
								xs={6}
								display="flex"
								justifyContent="left"
								alignItems="left"
								fontWeight={"bold"}
							>
								Step name
							</Grid>
							<Grid item xs={6}>
								{testResult.stepName}
							</Grid>
							<Grid
								item
								xs={6}
								display="flex"
								justifyContent="left"
								alignItems="left"
								fontWeight={"bold"}
							>
								Status
							</Grid>
							<Grid item xs={6}>
								{testResult.run ? (testResult.success ? "✅" : "❌") : ""}
							</Grid>
							<Grid
								item
								xs={6}
								display="flex"
								justifyContent="left"
								alignItems="left"
								fontWeight={"bold"}
							>
								Result
							</Grid>
							<Grid item xs={6}>
								{String(testResult.result ?? "")}
							</Grid>
							<Grid
								item
								xs={6}
								display="flex"
								justifyContent="left"
								alignItems="left"
								fontWeight={"bold"}
							>
								Message
							</Grid>
							<Grid item xs={6}>
								{testResult.message ?? ""}
							</Grid>
						</Grid>
					))}
				</Stack>
			);
		}
	}
}

ConnectionTestResultTableComponent.propTypes = {
	socket: PropTypes.object.isRequired,
	themeType: PropTypes.string,
	themeName: PropTypes.string,
	style: PropTypes.object,
	data: PropTypes.object.isRequired,
	schema: PropTypes.object,
	onError: PropTypes.func,
	onChange: PropTypes.func,
};

export default withMediaQuery("sm")(ConnectionTestResultTableComponent);
