# Architecture at a glance

```text
[ Expo rider app ]
        |
        v
[ API Gateway HTTP API ] ---> [ Cognito JWT authorizer for protected routes ]
        |
        v
[ Node.js + TypeScript Lambda handlers ]
        |
    +---+-------------+-----------------+
    |                 |                 |
    v                 v                 v
[ DynamoDB ]   [ Amazon Location ]  [ Open-Meteo ]
                         |                  |
                         +---------+--------+
                                   v
                       [ shared Heat Engine ]
                                   |
                          [ rider recommendations ]
```

The heat engine will be deterministic, versioned and tested. Weather data is not street-scale: nearby route alternatives must not claim verified shade or heat savings without relevant evidence.

No Express server and no fleet dashboard in the MVP. The app is Android-first, software-only, and rider-focused.
