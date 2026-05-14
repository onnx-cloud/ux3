---
title: "Related Work"
paper: "Secure Reactive UIs with Data-Driven Sanitizers and Policy-Aware Rendering"
chapter: 2
---

This chapter surveys the existing body of work related to frontend security and compile-time validation.

Existing web sanitization and Content Security Policy (CSP) approaches are dominated by runtime mechanisms. Libraries such as DOMPurify sanitize HTML payloads at the point of insertion, and CSP restricts script execution in the browser. These techniques are important, but they operate after the output has been constructed rather than during design or compilation.

Security-aware UI frameworks and runtime guards provide additional context. Some frameworks offer built-in sanitization for templates, while others instrument runtime data binding with security checks. The platform differs by placing the security model in the compiler, which ensures that unsafe constructs cannot be emitted into the generated runtime artifacts.

The chapter also considers the role of semantic metadata and linked data. JSON-LD and RDF provide a vocabulary for describing content provenance and policy metadata. In the platform, these semantic layers can be used to annotate widget content and to make policy enforcement more explicit.

By reviewing related work, the chapter identifies the gap that the platform addresses: a compile-first frontend framework that integrates security validation with reactive state modeling and plugin-provided content sources.
