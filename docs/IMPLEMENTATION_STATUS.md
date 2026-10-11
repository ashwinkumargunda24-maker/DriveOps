# DriveOps Implementation Status

## Production Readiness (2026-10-11)

**Current verdict: READY FOR STAGING**

Production approval is blocked on validation in a production-like deployment. Local code and integration checks do not prove external secret injection, deployed database/schema compatibility, durable upload storage, or operational health probes.

## Check Results

| Area | Check | Status | Evidence / limitation |
|---|---|---|---|
| Security | Production JWT, DB, CORS, and upload settings have no development fallback | VERIFIED | `application-prod.properties` requires `JWT_SECRET`, `MYSQL_URL`, `MYSQL_USER`, `MYSQL_PASSWORD`, `CORS_ALLOWED_ORIGINS`, and `UPLOAD_DIR`. |
| Security | Production configuration rejects weak JWT secrets and non-HTTPS/local CORS origins | VERIFIED | `ProductionConfigurationValidator` checks required values; automated tests reject a short secret and localhost HTTP origin. |
| Security | Demo account/data seeding is disabled outside the `dev` profile | VERIFIED | `DataSeeder` is active only under `dev`; the default profile is `dev`, while explicitly activating `prod` excludes it. |
| Security | Finance endpoint authorization for all five roles | VERIFIED | Direct API tests cover finance summary/history/details/export, monthly report list/detail/export/generation, revenue recording, expense listing/creation/review, and dashboard financial fields for every role. Unauthenticated finance/report reads return HTTP 401; unauthorized roles return HTTP 403. |
| Security | Finance officer organization scope | VERIFIED | Finance officers may report across branches in their organization, receive HTTP 403 for foreign-organization branch filters, and see only their own organization's branch rows and totals in monthly report snapshots/exports. |
| Security | Unauthorized monetary fields and expense access | VERIFIED | Fleet/branch manager dashboard payloads omit finance summaries and expense APIs are denied; trip revenue, maintenance cost, and fuel purchase-cost fields are omitted from their non-finance API payloads. Drivers retain personal expense/fuel submission and records. |
| Security | Public registration cannot select a privileged role | VERIFIED | A registration request supplying `role: SUPER_ADMIN` receives a `DRIVER` account; organization-management access is denied. |
| Deployment | Existing deployment configuration inventory | VERIFIED | No Docker, Compose, Kubernetes, CI/CD deployment, or IaC manifests were found. No deployment resources were changed. |
| Deployment | Production profile configuration and Hibernate schema behavior | VERIFIED | Production uses required environment placeholders and `spring.jpa.hibernate.ddl-auto=validate`; the production profile itself was not started. |
| Deployment | Production startup with real secret injection and external MySQL | NOT TESTED | No production credentials or deployed environment were available. JDK 17 is not installed in this environment; local Maven tests ran on Java 26. |
| Deployment | Actuator health/readiness/liveness endpoints over HTTP | NOT TESTED | `/actuator/health`, `/readyz`, and `/livez` are configured, but were not probed in a production-profile process. |
| Deployment | Upload directory permissions, persistence, and multi-instance access | NOT TESTED | Must be verified against the deployment's mounted/shared storage. |
| Financial integrity | Request-to-trip-to-revenue/expense-to-profit workflow | VERIFIED | Integration test creates and assigns a trip, completes it, records revenue and approved expenses, and checks expected totals. |
| Financial integrity | Historical month revenue, approved expenses, and profit | VERIFIED | MySQL-backed integration test checks a prior-month trip and approved/pending expenses against summary totals. |
| Financial integrity | Duplicate expense approval and ledger counting | VERIFIED | Second review is rejected with HTTP 409; approved ledger totals remain single-counted. |
| Financial integrity | Month-end snapshot, repeated generation, and regeneration | VERIFIED | Tests check snapshot totals, idempotent repeated generation, and version increment with stable totals on regeneration. |
| Financial integrity | Concurrent report generation and persisted FAILED state after an internal report-generation error | NOT TESTED | Sequential idempotency is tested. Concurrency and transaction-failure recovery need dedicated fault-injection/integration coverage. |
| Automated verification | Backend Maven tests | VERIFIED | `mvnw.cmd -f <backend>/pom.xml test -q`: 15 tests, 0 failures, 0 errors, 0 skipped; connected to local MySQL 8.0.46. Executed on Java 26. |
| Automated verification | Frontend production build | VERIFIED | `npm.cmd --prefix frontend run build`: optimized production build compiled successfully. Node emitted the existing `fs.F_OK` deprecation warning. |
| Automated verification | Failed/unauthorized operations | VERIFIED | Tests reject non-finance financial API access, unauthorized expense submission/review and report generation, cross-organization finance filters, and foreign-organization report data; trip assignment/completion, expense submission/approval, and revenue workflow remain covered. |

## Frontend Audit Remediation (2026-10-11)

| Finding | Change | Verification | Remaining limitation |
|---|---|---|---|
| Driver could start an assigned future trip | The driver view now selects in-progress trips or an assignment scheduled for today; Start Trip remains disabled until its valid scheduled timestamp. | Component tests cover a future-day trip, a later-today trip, and a startable due trip. | This is a frontend guard. The backend currently permits an authorized `ASSIGNED` to `STARTED` transition without checking the scheduled time; callers can bypass a client-only guard. |
| Navigation was unavailable on narrow screens | Added a small-screen drawer/backdrop/menu toggle for the existing role-specific sidebar, including a working return path from Management. | Component tests cover opening/closing driver navigation and the Management return path; the frontend build passes. | No separate manual browser acceptance run was performed for the drawer after this change. |
| Driver recent list duplicated fuel purchases | The driver recent list omits `FUEL` expenses and keeps the fuel record as the single displayed purchase; other expenses remain visible. Backend ledger writes were not changed. | Component test checks a paired fuel/expense record appears once and a toll remains visible. | No accounting data is removed; the separate backend expense entry remains available to finance workflows. |
| Legacy account pages used obsolete endpoints and exposed password fields | `/dboard` now loads the authenticated `/auth/me` profile; `/update` posts to `/auth/change-password` and validates confirmation; `/del` clearly reports that self-service deletion is unsupported. | Tests cover profile credential non-display, password update request/confirmation, and deletion messaging. | There is no backend self-service account deletion endpoint; account deactivation remains an administrator request. |
| API host was hard-coded | The shared client now reads `REACT_APP_API_BASE_URL`, trims trailing slashes, and retains the local backend URL as the fallback. Frontend README documents configuration. | API client tests cover an explicit URL override and the local fallback. | Set the variable before the deployed frontend build and configure backend CORS for the frontend origin. |

Final frontend verification after these changes: `npm.cmd test -- --watchAll=false --runInBand` passed 8 suites and 14 tests; `npm.cmd run build` compiled successfully. React Router future-flag and Node `fs.F_OK` deprecation warnings remain. No backend authorization or data behavior was weakened or changed as part of these frontend fixes.

## Public Signup Phone Number (2026-10-11)

Public signup now requires a phone number. The backend trims and stores it on the newly created application user and linked driver record, and includes it in the registration and authenticated profile payloads. Public registration continues to assign the `DRIVER` role regardless of any submitted role. The authenticated account page displays the saved phone number.

Verification: frontend signup/profile tests passed (2 suites, 2 tests), the frontend production build compiled successfully, and the full backend Maven suite passed (15 tests, 0 failures, 0 errors, 0 skipped) against local MySQL 8.0.46. Backend integration coverage verifies trimmed phone persistence for both records, authenticated profile retrieval, required-phone validation, and unchanged role restrictions. Java editor diagnostics still report existing false-positive test-code warnings around Spring's fluent MockMvc calls; Maven test execution passes.

## Production Environment

Set `SPRING_PROFILES_ACTIVE=prod`. These variables are required by the production profile; supply secrets through the deployment platform's secret manager, not source control:

| Variable | Requirement |
|---|---|
| `MYSQL_URL` | MySQL JDBC URL, for example `jdbc:mysql://<host>:3306/<database>` |
| `MYSQL_USER` | Least-privilege application database account |
| `MYSQL_PASSWORD` | Secret for the application database account |
| `JWT_SECRET` | Cryptographically random value of at least 32 UTF-8 bytes |
| `CORS_ALLOWED_ORIGINS` | Comma-separated HTTPS origins only; no wildcard, localhost, path, query, or fragment |
| `UPLOAD_DIR` | Writable persistent mount for uploaded evidence; ensure filesystem permissions and backups |

Optional overrides are `JWT_EXPIRATION_MS` (default `86400000`), `APP_TIMEZONE` (default `Asia/Kolkata`), `REPORTING_CRON` (default `0 15 0 1 * *`), and `SERVER_PORT` (default `8081`).

## Deployment Procedure

1. Provision MySQL and apply the schema before starting the application. Production runs Hibernate in `validate` mode and does not create or migrate tables. No Flyway/Liquibase migrations or deployment manifests are currently present.
2. Provision a persistent upload directory with write access for the application identity. Use shared storage if multiple instances must read uploaded files.
3. Build from the repository root with the existing wrapper:

	```powershell
	.\backend\backend\demo\mvnw.cmd -f .\backend\backend\demo\pom.xml -DskipTests package
	```

4. Inject the required variables using the host's secret/configuration mechanism, set `SPRING_PROFILES_ACTIVE=prod`, then launch:

	```powershell
	java -jar .\backend\backend\demo\target\demo-0.0.1-SNAPSHOT.jar
	```

5. Configure the platform to probe `/actuator/health`, `/readyz`, and `/livez`. Confirm a healthy database component and verify upload creation/read behavior before routing traffic.

## Verification Commands

Executed from the repository root on Windows:

```powershell
& .\backend\backend\demo\mvnw.cmd -f .\backend\backend\demo\pom.xml test -q
npm.cmd --prefix frontend run build
```

Results: backend 14/14 tests passed against local MySQL 8.0.46; frontend production build compiled successfully. Node emitted an `fs.F_OK` deprecation warning. A dedicated Maven runner could not detect JDK 17, so the wrapper test run used Java 26 while the project compiles for Java 17 (`java.version=17`).

## Remaining Production Approval Steps

- Install/use JDK 17 for a clean repeat of the Maven tests and production startup check.
- Deploy to a production-like environment with externally managed secrets and a pre-migrated MySQL schema; verify startup fails when any required variable is absent or invalid.
- Probe health/readiness/liveness endpoints and validate database and persistent upload access from the deployed identity.
- Exercise concurrent report generation and injected report-generation failures; verify no duplicate snapshots and that failure state is recoverable.
- Run browser/API smoke tests against the deployed frontend/backend origins, including CORS preflight and role/branch restrictions.
- Resolve the existing frontend build warnings before making warning-free CI a release gate.

Until those deployment and operational checks have supporting evidence, do not promote this verdict beyond **READY FOR STAGING**.
