## App SDK

The App SDK includes helpers and interfaces for apps running on the Optimizely Connect Platform (OCP).

### Get started

The following OCP command-line interface (CLI) command scaffolds your app and installs the dependencies, including this SDK.

```shell
ocp app init
```

### The basics

OCP apps are built on the Node platform with support for Node 18 and Typescript. Follow Typescript best practices to ensure more stable integrations with fewer bugs.

OCP apps are required to follow conventions outlined in the developer docs. They are composed of:

- _.env_ – Environment secrets that are published securely with an app.
- _app.yml_ – A description of an app, including its abilities and requirements.
- _forms/_ – YAML-based forms that generate UIs for customer interactions.
- _src/channel_ – Channel-based app implementation.
- _src/functions/_ – Webhooks for receiving data and serving content.
- _src/jobs/_ – Scheduled and triggered jobs to handle long running/recurring tasks.
- _src/lifecycle/_ – Handler for lifecycle actions (install/uninstall/OAuth/submit settings updates).
- _src/liquid-extension_ – Extensions for dynamic campaign content (powered by Shopify Liquid).
- _src/schema_ – Custom fields and relations users are required to install with an app.

Apps are run in an isolated environment and to avoid data leaking/pollution across accounts.
However, there can be hundreds of requests running simultaneously, so avoid race conditions when interacting with external storage and APIs.
