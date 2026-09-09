# Findings & Architecture Decisions (v0.7.8)

## 1. Browser Request Race Conditions
In `CostMeter`, rapid model switches or toggling the popover calls `load(usedKeys)`. Since network latency varies, an older request might resolve after a newer one. By tracking an active request counter or cancellation token per effect invocation, we ensure only the most up-to-date state response mutates the component state.

## 2. IANA TimeZone Validation
`Intl.DateTimeFormat(undefined, { timeZone })` throws a `RangeError` if the timezone string is invalid. We can safely leverage this in `CostMeterCard` to reject typos (e.g. `Europe/Moskow` instead of `Europe/Moscow`) on the client before writing to `settingsScope`.

## 3. Query Parameter Sanitization
The endpoint `GET /dsh-cost-meter/state?models=...` accepts comma-separated model keys. Adding a length bound (e.g. <= 128 chars) and trimming ensures no malformed payloads cause unexpected overhead.
