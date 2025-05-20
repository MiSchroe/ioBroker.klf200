import { join, dirname } from "path";
import { tests } from "@iobroker/testing";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate the package files
tests.packageFiles(join(__dirname, ".."));
