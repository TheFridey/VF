# VeteranFinder Infrastructure

Infrastructure as Code for VeteranFinder platform using Terraform (AWS) and Kubernetes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CloudFront                               │
│                    (CDN + SSL Termination)                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                  Application Load Balancer                       │
│                     (HTTPS + Path Routing)                       │
└─────────┬───────────────────────────────────────┬───────────────┘
          │                                       │
          │ /api/*                               │ /*
          ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────┐
│    ECS Fargate      │               │    ECS Fargate      │
│    (API Service)    │               │    (Web Service)    │
│    NestJS + Node    │               │    Next.js + Node   │
└─────────┬───────────┘               └─────────────────────┘
          │
          ├──────────────┬──────────────┐
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│     RDS      │  │ ElastiCache  │  │      S3      │
│  PostgreSQL  │  │    Redis     │  │   Uploads    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Directory Structure

```
infrastructure/
├── terraform/
│   ├── main.tf                 # Main configuration
│   ├── variables.tf            # Variable definitions
│   ├── modules/
│   │   ├── vpc/               # VPC, subnets, NAT gateways
│   │   ├── rds/               # PostgreSQL database
│   │   ├── redis/             # ElastiCache Redis
│   │   ├── s3/                # S3 buckets
│   │   ├── alb/               # Application Load Balancer
│   │   ├── ecs/               # ECS cluster and services
│   │   └── cloudfront/        # CDN distribution
│   └── environments/
│       ├── dev/
│       ├── staging/
│       └── prod/
├── kubernetes/
│   ├── base/                  # Base configurations
│   └── overlays/
│       ├── dev/
│       ├── staging/
│       └── prod/
└── README.md
```

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.5.0
- kubectl >= 1.28
- kustomize >= 5.0

## Terraform Deployment

### Initial Setup

1. Create S3 bucket for Terraform state:
```bash
aws s3 mb s3://veteranfinder-terraform-state-${AWS_ACCOUNT_ID}
aws s3api put-bucket-versioning --bucket veteranfinder-terraform-state-${AWS_ACCOUNT_ID} --versioning-configuration Status=Enabled
```

2. Create DynamoDB table for state locking:
```bash
aws dynamodb create-table \
  --table-name veteranfinder-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

3. Configure backend in `main.tf`:
```hcl
backend "s3" {
  bucket         = "veteranfinder-terraform-state-ACCOUNT_ID"
  key            = "env/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "veteranfinder-terraform-locks"
}
```

### Deploy Environment

```bash
cd terraform

# Initialize
terraform init

# Plan (dev environment)
terraform plan -var-file=environments/dev/terraform.tfvars

# Apply
terraform apply -var-file=environments/dev/terraform.tfvars

# For production
terraform plan -var-file=environments/prod/terraform.tfvars
terraform apply -var-file=environments/prod/terraform.tfvars
```

### Required Variables

Create `secrets.tfvars` (DO NOT commit to git):

```hcl
db_username        = "your-db-username"
db_password        = "your-secure-password"
jwt_secret         = "your-jwt-secret-min-32-chars"
jwt_refresh_secret = "your-jwt-refresh-secret"
encryption_key     = "your-32-char-encryption-key"
resend_api_key     = "re_your_resend_api_key"
from_email         = "VeteranFinder <noreply@veteranfinder.co.uk>"
partnerships_email_to = "partnerships@veteranfinder.co.uk"
```

Apply with secrets:
```bash
terraform apply -var-file=environments/prod/terraform.tfvars -var-file=secrets.tfvars
```

## Kubernetes Deployment

### Prerequisites

1. Configure kubectl to point to your cluster:
```bash
aws eks update-kubeconfig --region us-east-1 --name veteranfinder-cluster
```

2. Install required operators:
```bash
# cert-manager for TLS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# nginx-ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.0/deploy/static/provider/aws/deploy.yaml
```

### Deploy

```bash
cd kubernetes

# Create secrets from template
cp base/secrets.yaml.template overlays/prod/secrets.yaml
# Edit secrets.yaml with actual values

# Deploy to dev
kubectl apply -k overlays/dev

# Deploy to staging
kubectl apply -k overlays/staging

# Deploy to production
kubectl apply -k overlays/prod

# Check status
kubectl get pods -n veteranfinder
kubectl get ingress -n veteranfinder
```

### Useful Commands

```bash
# View logs
kubectl logs -f deployment/api -n veteranfinder

# Scale deployment
kubectl scale deployment/api --replicas=5 -n veteranfinder

# Rollback
kubectl rollout undo deployment/api -n veteranfinder

# Check HPA status
kubectl get hpa -n veteranfinder
```

## Local Development

Use docker-compose for local development:

```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up -d --build

# View logs
docker-compose logs -f api

# Stop
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

Local services:
- API: http://localhost:3000
- Web: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

Email delivery is handled by Resend in deployed environments. Without a `RESEND_API_KEY`, the API logs email activity instead of sending it.

## CI/CD

### GitHub Actions

This repository currently ships with two GitHub Actions workflows:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

The deploy workflow is image-based and SSH-driven:

- builds `api`, `web`, and `admin` images
- pushes them to GHCR
- runs Prisma migrations with the new API image
- restarts the application containers on the target host
- verifies the configured healthcheck URL

The ECS example below is reference infrastructure only and is not the active repo deploy path today:

```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build and push API image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        run: |
          docker build -t $ECR_REGISTRY/veteranfinder-api:${{ github.sha }} ./apps/api
          docker push $ECR_REGISTRY/veteranfinder-api:${{ github.sha }}
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster vf-prod-cluster --service vf-prod-api --force-new-deployment
```

## Monitoring

### CloudWatch Alarms

Key alarms are configured for:
- API 5xx errors > 10/minute
- API latency > 5 seconds
- CPU utilization > 80%
- Memory utilization > 80%
- Database connections > 80%

### Dashboards

CloudWatch dashboards are created for:
- API performance
- Database metrics
- Cache hit rates
- Error rates

## Security

- All data encrypted at rest (RDS, S3, ElastiCache)
- TLS 1.2+ for all connections
- VPC with private subnets for databases
- Security groups with least privilege
- IAM roles for ECS tasks (no static credentials)
- Secrets managed via AWS Secrets Manager / K8s Secrets

## Cost Optimization

| Environment | Monthly Estimate |
|-------------|------------------|
| Dev         | ~$100            |
| Staging     | ~$150            |
| Production  | ~$500-1000       |

Tips:
- Use Reserved Instances for production RDS
- Enable S3 lifecycle policies
- Use Spot instances for non-critical workloads
- Review CloudWatch logs retention

## Troubleshooting

### Common Issues

1. **ECS task won't start**
   - Check CloudWatch logs
   - Verify secrets are set
   - Check security group rules

2. **Database connection issues**
   - Verify security group allows ECS → RDS
   - Check DATABASE_URL format
   - Ensure RDS is in correct subnet

3. **S3 access denied**
   - Check IAM role permissions
   - Verify bucket policy
   - Check CORS configuration

## License

Proprietary - VeteranFinder
