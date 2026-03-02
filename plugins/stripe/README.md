# Stripe plugin (example)

This sample illustrates a payments integration.

Usage notes:

* declares `stripe` as a peer dependency
* reads configuration from `app.config.plugins.stripe` (set in `ux3.yaml`)
* optionally injects an external script (by default `https://js.stripe.com/v3`)
* registers a `stripe` service that can be used in FSMs or anywhere via
  `app.services.stripe.getClient()`.

A post‑install hook (in a real package) might modify the host project's
`ux3.yaml` to add the script asset; in this monorepo the README shows the
manual steps.
