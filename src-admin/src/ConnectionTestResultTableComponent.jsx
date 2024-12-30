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
import { I18n } from "@iobroker/adapter-react-v5";

const ConnectionTestResultTableComponent = ({ testResults }) => {
	const theme = useTheme();
	const matches = useMediaQuery(theme.breakpoints.up("sm"));

	if (matches) {
		return (
			<TableContainer>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell align="left" size="small">
								{I18n.t("custom_klf200_test_connection_status_header")}
							</TableCell>
							<TableCell align="left">
								{I18n.t("custom_klf200_test_connection_step_name_header")}
							</TableCell>
							<TableCell align="left">{I18n.t("custom_klf200_test_connection_result_header")}</TableCell>
							<TableCell align="left">{I18n.t("custom_klf200_test_connection_message_header")}</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{testResults.map((testResult) => (
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
				{testResults.map((testResult) => (
					<Grid container key={testResult.stepOrder}>
						<Grid item xs={6} display="flex" justifyContent="left" alignItems="left" fontWeight={"bold"}>
							{I18n.t("custom_klf200_test_connection_step_name_header")}
						</Grid>
						<Grid item xs={6}>
							{testResult.stepName}
						</Grid>
						<Grid item xs={6} display="flex" justifyContent="left" alignItems="left" fontWeight={"bold"}>
							{I18n.t("custom_klf200_test_connection_status_header")}
						</Grid>
						<Grid item xs={6}>
							{testResult.run ? (testResult.success ? "✅" : "❌") : ""}
						</Grid>
						<Grid item xs={6} display="flex" justifyContent="left" alignItems="left" fontWeight={"bold"}>
							{I18n.t("custom_klf200_test_connection_result_header")}
						</Grid>
						<Grid item xs={6}>
							{String(testResult.result ?? "")}
						</Grid>
						<Grid item xs={6} display="flex" justifyContent="left" alignItems="left" fontWeight={"bold"}>
							{I18n.t("custom_klf200_test_connection_message_header")}
						</Grid>
						<Grid item xs={6}>
							{testResult.message ?? ""}
						</Grid>
					</Grid>
				))}
			</Stack>
		);
	}
};

export default ConnectionTestResultTableComponent;
