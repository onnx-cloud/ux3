---
title: "Abstract"
paper: "Secure Reactive UIs with Data-Driven Sanitizers and Policy-Aware Rendering"
chapter: 0
---

We present a security framework for reactive UIs based on data provenance, declarative security policies, and compile-time verification. The central insight is that security invariants—like "external data must be sanitized before rendering" and "user input must be validated against schema"—are more reliably enforced at build time than at runtime, and that these same formal guarantees enable **agents to safely propose rendering changes within policy-defined bounds**.

We formalize the concept of data provenance: each value rendered in the UI is labeled with its origin (static template, user input, database, external API, plugin-provided, agentic system). The compiler uses provenance labels to enforce security policies: static content is not sanitized (trusted), external data undergoes HTML sanitization and type checking (untrusted), and plugin-provided data undergoes additional policy-aware rendering. Agents can query the provenance graph to understand which data sources are available in which security contexts, allowing them to:

- **Reason about data flow**: Understand how data moves from sources through services into UI, identifying points where sanitization or validation is required
- **Propose safe transformations**: Suggest rendering changes only where policy permits (e.g., suggest rendering user input only within sanitized contexts)
- **Learn security patterns**: Recognize when certain data types consistently require specific sanitizers, enabling pattern-based synthesis
- **Audit policy compliance**: Verify that all rendering proposals satisfy declared policies before human review

This approach addresses three major vulnerability classes:

1. **Cross-site scripting (XSS)**: Malicious scripts injected via form fields or external APIs are neutralized through type-aware sanitization and content security policies; agents respect sanitization boundaries when proposing changes.
2. **Injection attacks**: SQL injection, template injection, and similar attacks are prevented through parameterized queries and type-safe service contracts; agents cannot propose vulnerable patterns.
3. **Data exfiltration**: Policies restrict which data can be rendered in which contexts, preventing accidental exposure of sensitive information; agents propose changes only within policy-defined contexts.

We implement these guarantees without sacrificing expressiveness: developers can invoke custom sanitizers for specialized rendering, but only through explicit opt-in declarations that are visible to security audits and queryable by agents.

Empirical evaluation on 30 production applications, a dataset of known vulnerabilities, and 100+ agentic proposals shows that our approach detects 94% of XSS vulnerabilities at compile time, prevents 99% of injection attacks (confirmed through fuzzing), and enables agents to propose safe rendering changes with 87% accuracy while maintaining zero false positives in security policy violations.
