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
	Grid2,
} from "@mui/material";
import { I18n } from "@iobroker/adapter-react-v5";

class ConnectionTestResult {
	/**
	 * Constructor for a ConnectionTestResult.
	 *
	 * @param stepOrder The step number of the test in the order of execution.
	 * @param stepName A short description of the test step.
	 * @param run A boolean indicating whether the test step was run.
	 * @param success A boolean indicating whether the test step was successful.
	 * @param message A string message giving more information about the test result.
	 * @param result An optional result object that can be an Error, a string or a number.
	 */
	public constructor(
		public readonly stepOrder: number,
		public readonly stepName: string,
		public readonly run: boolean,
		public readonly success?: boolean,
		public readonly message?: string,
		public readonly result?: Error | string | number,
	) {}
}

const ConnectionTestResultTableComponent = ({ testResults }: { testResults: ConnectionTestResult[] }): JSX.Element => {
	const theme = useTheme();
	const matches = useMediaQuery(theme.breakpoints.up("sm"));

	if (matches) {
		return (
			<TableContainer>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell
								align="left"
								size="small"
							>
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
						{testResults.map(testResult => (
							<TableRow
								key={testResult.stepOrder}
								sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
								hover={true}
							>
								<TableCell
									align="center"
									size="small"
								>
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
	}
	return (
		<Stack
			divider={
				<Divider
					orientation="horizontal"
					flexItem
				/>
			}
			spacing={1}
			sx={{ marginTop: 1, overflow: "auto", height: "100%" }}
		>
			{testResults.map(testResult => (
				<Grid2
					container
					key={testResult.stepOrder}
				>
					<Grid2
						size={{ xs: 6 }}
						display="flex"
						justifyContent="left"
						alignItems="left"
						fontWeight={"bold"}
					>
						{I18n.t("custom_klf200_test_connection_step_name_header")}
					</Grid2>
					<Grid2 size={{ xs: 6 }}>{testResult.stepName}</Grid2>
					<Grid2
						size={{ xs: 6 }}
						display="flex"
						justifyContent="left"
						alignItems="left"
						fontWeight={"bold"}
					>
						{I18n.t("custom_klf200_test_connection_status_header")}
					</Grid2>
					<Grid2 size={{ xs: 6 }}>{testResult.run ? (testResult.success ? "✅" : "❌") : ""}</Grid2>
					<Grid2
						size={{ xs: 6 }}
						display="flex"
						justifyContent="left"
						alignItems="left"
						fontWeight={"bold"}
					>
						{I18n.t("custom_klf200_test_connection_result_header")}
					</Grid2>
					<Grid2 size={{ xs: 6 }}>{String(testResult.result ?? "")}</Grid2>
					<Grid2
						size={{ xs: 6 }}
						display="flex"
						justifyContent="left"
						alignItems="left"
						fontWeight={"bold"}
					>
						{I18n.t("custom_klf200_test_connection_message_header")}
					</Grid2>
					<Grid2 size={{ xs: 6 }}>{testResult.message ?? ""}</Grid2>
				</Grid2>
			))}
		</Stack>
	);
};

export default ConnectionTestResultTableComponent;
