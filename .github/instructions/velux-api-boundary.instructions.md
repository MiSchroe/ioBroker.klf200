---
name: "VELUX API Boundary"
description: "Use when implementing, improving, refactoring, or testing the ioBroker KLF-200 adapter, especially code that communicates with a VELUX KLF-200 gateway or uses klf-200-api."
applyTo: "src/**/*.ts, test/**/*.ts"
---

# VELUX API Boundary

- Implement ioBroker-specific behavior, state mapping, lifecycle handling, and user-facing configuration in this repository.
- Manage every VELUX KLF-200 API operation through the public API exported by the `klf-200-api` package.
- Do not implement or duplicate KLF-200 commands, protocol framing, socket communication, gateway authentication, request/response handling, or VELUX-specific transport logic in the adapter.
- Do not import private or internal paths from `klf-200-api`; use only its public package exports.
- When the package lacks a required VELUX capability, implement and test that capability in the sibling `klf-200-api` repository first, then consume it through the package's public API here.
- Keep tests aligned with this boundary: mock or stub `klf-200-api`, or use the existing mock gateway for integration coverage. Do not add production protocol logic to make tests pass.
