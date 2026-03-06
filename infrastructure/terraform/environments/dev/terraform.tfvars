# Dev Environment Configuration

environment = "dev"
aws_region  = "us-east-1"

# Domain
domain_name = "dev.veteranfinder.com"

# VPC
vpc_cidr = "10.0.0.0/16"

# RDS
db_instance_class    = "db.t3.micro"
db_allocated_storage = 20
db_name              = "veteranfinder_dev"

# Redis
redis_node_type = "cache.t3.micro"
redis_num_nodes = 1

# ECS - API
api_cpu           = 256
api_memory        = 512
api_desired_count = 1

# ECS - Web
web_cpu           = 256
web_memory        = 512
web_desired_count = 1

# CloudFront
enable_cloudfront = false

# Images (update with actual ECR images)
# api_image = "123456789.dkr.ecr.us-east-1.amazonaws.com/veteranfinder-api:dev"
# web_image = "123456789.dkr.ecr.us-east-1.amazonaws.com/veteranfinder-web:dev"
