# DynamoDB model (logical design)

```text
USER
  |-- SHIFTS
  |      |-- TRIPS
  |      |-- EXPOSURE SEGMENTS
  |      `-- SAFETY EVENTS
  `-- DAILY EXPOSURE SUMMARY
```

Six logical entities: `User`, `Shift`, `Trip`, `ExposureSegment`, `DailyExposure`, `SafetyEvent`.

The planned single-table design will use user-scoped keys and conditionally update active shift/trip state. **Exact PK/SK/GSI, concurrency controls, retention and idempotency records must be approved before CDK implementation.**

Avoid saving every raw GPS ping, route search or third-party API response.
