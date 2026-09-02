# Older changes
## 1.3.3 (2024-11-01)

- (Michael Schroeder) [#250](https://github.com/MiSchroe/ioBroker.klf200/issues/250) Fixed an issue that the adapter didn't start when the product nodes weren't numbered from 0 onwards.

## 1.3.2 (2024-10-01)

- (Michael Schroeder) [#224](https://github.com/MiSchroe/ioBroker.klf200/issues/224) Fixed timeout error during adapter start in some special cases.
- (Michael Schroeder) [#246](https://github.com/MiSchroe/ioBroker.klf200/issues/246) Fixed an issue that logged the same log entry multiple times.
- (Michael Schroeder) [#210](https://github.com/MiSchroe/ioBroker.klf200/issues/210) Run integration tests against a virtual mock version of an KLF-200.
- (Michael Schroeder) [#233](https://github.com/MiSchroe/ioBroker.klf200/issues/233) Fixed findings of Adapter Checker.
- (Michael Schroeder) Upgrade dependencies

## 1.3.1 (2024-07-17)

- (Michael Schroeder) [#214](https://github.com/MiSchroe/ioBroker.klf200/issues/214) Fixed error while retrieving the version number of the klf-200-api package.
- (Michael Schroeder) [#215](https://github.com/MiSchroe/ioBroker.klf200/issues/215) Added a device manager tab to the settings dialog for managing devices, groups and scenes.
- (Michael Schroeder) [#217](https://github.com/MiSchroe/ioBroker.klf200/issues/217) Refresh statusReply after reading the limitations to show correct values.
- (Michael Schroeder) [#218](https://github.com/MiSchroe/ioBroker.klf200/issues/218) Refresh runStatus after reading the limitations to show correct values.

## 1.3.0 (2024-07-15)

- (Michael Schroeder) [#180](https://github.com/MiSchroe/ioBroker.klf200/issues/180) Fixed handling new product detection.
- (Michael Schroeder) [#47](https://github.com/MiSchroe/ioBroker.klf200/issues/47), [#113](https://github.com/MiSchroe/ioBroker.klf200/issues/113) Support limitations (e.g. rain sensor)
- (Michael Schroeder) [#209](https://github.com/MiSchroe/ioBroker.klf200/issues/209) Support of [ioBroker.device-manager](https://www.npmjs.com/package/iobroker.device-manager) for managing products, groups and scenes.
- (Michael Schroeder) Fix missing removal of event handlers.
- (Michael Schroeder) Upgrade dependencies, min. Node version 18.x, min. js-controller 5.x.
- (Michael Schroeder) Added stricter linting rules and fixed findings.

## 1.2.0 (2024-02-09)

- (Michael Schroeder) [#126](https://github.com/MiSchroe/ioBroker.klf200/issues/126) Fixed Adapter-Checker warning.
- (Michael Schroeder) [#124](https://github.com/MiSchroe/ioBroker.klf200/issues/124) Added help message for password in configuration dialog.
- (Michael Schroeder) [#106](https://github.com/MiSchroe/ioBroker.klf200/issues/106) Fixed an unhandled rejection exception.
- (Michael Schroeder) [#135](https://github.com/MiSchroe/ioBroker.klf200/issues/135) Fixed warning for Admin settings.
- (Michael Schroeder) [#137](https://github.com/MiSchroe/ioBroker.klf200/issues/137) Fixed Github Workflows.
- (Michael Schroeder) [#40](https://github.com/MiSchroe/ioBroker.klf200/issues/40) The scene list can be refreshed.
- (Michael Schroeder) [#129](https://github.com/MiSchroe/ioBroker.klf200/issues/129) The state targetPositionRaw is writable to support additional scenarios.
- (Michael Schroeder) [#133](https://github.com/MiSchroe/ioBroker.klf200/issues/133) Added a refreshProduct state to manually refresh the state of a product.

## 1.1.2 (2023-10-19)

- (Michael Schroeder) Bumped version number

## 1.1.1 (2023-10-18)

- (Michael Schroeder) Upgrade dependencies, switch to Typescript 4.6, compatibility check with js-controller 4.x
- (Michael Schroeder) [#12](https://github.com/MiSchroe/ioBroker.klf200/issues/12) Support silent mode in scenes
- (Michael Schroeder) [#44](https://github.com/MiSchroe/ioBroker.klf200/issues/44) Add advanced SSL configuration settings
- (Michael Schroeder) [#98](https://github.com/MiSchroe/ioBroker.klf200/issues/98) Fix default values
- (Michael Schroeder) [#77](https://github.com/MiSchroe/ioBroker.klf200/issues/77) Add silent mode to products using functional parameters
- (Michael Schroeder) Upgrade dependencies
- (Michael Schroeder) [#55](https://github.com/MiSchroe/ioBroker.klf200/issues/55) Support functional parameters FP1-4

## 1.0.1 (2020-07-20)

- (Michael Schroeder) Fix [#49](https://github.com/MiSchroe/ioBroker.klf200/issues/49) Set multiple states at once, e.g. in Blockly

## 1.0.0

- (Michael Schroeder) Support of firmware 2.0.0.71

## 0.9.5

- (Michael Schroeder) Bug fixes

## 0.9.4

- (Michael Schroeder) Compatible to Admin 3, add documentation

## 0.9.0

- (Michael Schroeder) Initial public beta release

## 0.0.1

- (Michael Schroeder) Initial developer release
