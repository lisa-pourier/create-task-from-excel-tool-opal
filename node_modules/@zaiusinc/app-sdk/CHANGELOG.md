# 1.4.0
Allowing configuring OCP runtime using Async Local Storage 
Removing code related to OCP Queues

# 1.3.10
Improving error handling of app validation (OCP-666)

# 1.3.9
Preventing hanging streams when 'process' callback method fails (OCP-629)

# 1.3.8
Improving error handling of stream processors (OCP-629)

# 1.3.7
Support installation_resolution for functions (OCP-573)

# 1.3.6
Added deduplication id support for OCP Queues (OCP-595)

# 1.3.5
Inferring queue type from queue name (OCP-572)

# 1.3.4
Upgrading deps to fix vulnerabilities (OCP-586)

# 1.3.3
Allowing deploying to only none-primary shards (OCP-590)
Fixing broken links in docs (OCP-584)

# 1.3.2
Support default group for fifo queues (OCP-530)

# 1.3.1
Fixing queue consumer constructor (OCP-489)

# 1.3.0
OCP Queues interfaces (OCP-489)

# 1.2.6
Adding vector field type to the schema (OCP-479)

# 1.2.5
Allowing .yaml extension for schema files (OCP-452)

# 1.2.4
Exit on validation error (OCP-365)

# 1.2.3
Remove dependency on legacy assets/docs/

# 1.2.2
Exporting extra Logger constants (OCP-195)

# 1.2.1
Export the default log level for anduin to use when configuring the sdks in preparation for a fn call or job (OCP-195)

# 1.2.0
Add ability to change log level in runtime (OCP-195)

# 1.1.4
Fixing doc url (OCP-34)

# 1.1.3
Updating docs (OCP-34)

# 1.1.2
Adding cron expression validation (OCP-70)

# 1.1.1
Fixing invalid import - previous version got compiled to invalid js (ZAIUS-16867)

# 1.1.0
node18 as a valid runtime (ZAIUS-16677)

# 1.0.0
Support for node18
Modernization of dependencies

# 0.17.7
Bump forms schema so new OAuthImageButton element type is visible for form creation (ZAIUS-16463)

# 0.17.6
AppManifest.meta.availability is now required to be present in the manfiest.

# 0.11.5
Update app-forms-schema (corrected json schema)

# 0.11.4
Update app-forms-schema (adds support for zaiusAdminOnly sections)

# 0.11.3
Add local stores for jest use cases. Minor breaking refactor for resetting kv local store.

# 0.11.0
Renamed channel grouping to channel type in app manifest/app.yml
