---
title: "Evaluation Plan"
paper: "Secure Reactive UIs with Data-Driven Sanitizers and Policy-Aware Rendering"
chapter: 7
---

This chapter defines an evaluation plan for secure reactive interfaces.

Quantitative measures include time to detect unsafe content paths, rate of prevented unsafe emissions, and false-positive rates for compile-time enforcement. Qualitative measures include clarity of diagnostics and developer confidence when reviewing policy decisions.

A stronger evaluation should also measure live auditability. Useful tasks include replaying a problematic session, inspecting provenance labels for rendered content, and tracing which tool invocation or plan step introduced a sensitive value. These measures distinguish a policy-aware host from a system that merely sanitizes strings.
