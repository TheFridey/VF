# Production Environment Configuration

environment = "prod"
aws_region  = "us-east-1"

# Domain
domain_name = "veteranfinder.com"

# VPC
vpc_cidr = "10.0.0.0/16"

# RDS - Production sizing
db_instance_class    = "db.t3.medium"
db_allocated_storage = 100
db_name              = "veteranfinder"

# Redis - Production with replication
redis_node_type = "cache.t3.small"
redis_num_nodes = 2

# ECS - API (scaled for production)
api_cpu           = 512
api_memory        = 1024
api_desired_count = 3

# ECS - Web (scaled for production)
web_cpu           = 512
web_memory        = 1024
web_desired_count = 3

# CloudFront - Enable for production
enable_cloudfront = true

# Images (update with actual ECR images)
# api_image = "123456789.dkr.ecr.us-east-1.amazonaws.com/veteranfinder-api:latest"
# web_image = "123456789.dkr.ecr.us-east-1.amazonaws.com/veteranfinder-web:latest"
