# AWS CDK infrastructure (next step)

CDK setup will create, after review:

- API Gateway HTTP API with `GET /v1/health` (and later versioned domain routes)
- Node.js Lambda functions with TypeScript bundled by esbuild
- Cognito user pool and JWT authorizer (for protected routes)
- DynamoDB table with keys and indexes matching approved access patterns
- Restrictive IAM permissions, CloudWatch logs and sensible quotas

**No AWS resources are provisioned by this scaffold.** Physical DynamoDB PK/SK/GSI and transaction design still need to be finalized before deployment. Never commit credentials.
