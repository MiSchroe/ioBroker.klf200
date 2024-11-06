const CracoEsbuildPlugin = require("craco-esbuild");
const { ProvidePlugin } = require("webpack");
const cracoModuleFederation = require("@iobroker/adapter-react-v5/craco-module-federation");

module.exports = {
	plugins: [{ plugin: CracoEsbuildPlugin }, { plugin: cracoModuleFederation, options: { useNamedChunkIds: true } }],
	devServer: {
		proxy: {
			"/files": "http://127.0.0.1:8081",
			"/adapter": "http://127.0.0.1:8081",
			"/session": "http://127.0.0.1:8081",
			"/log": "http://127.0.0.1:8081",
			"/lib": "http://127.0.0.1:8081",
		},
	},
	webpack: {
		output: {
			publicPath: "./",
		},
		plugins: [
			new ProvidePlugin({
				React: "react",
			}),
		],
		configure: (webpackConfig) => {
			webpackConfig.output.publicPath = "./";
			webpackConfig.resolve = webpackConfig.resolve || {};
			webpackConfig.resolve.fallback = webpackConfig.resolve.fallback || {};
			webpackConfig.resolve.fallback.os = false;
			return webpackConfig;
		},
	},
};
