# VeteranFinder Infrastructure
# Main Terraform Configuration

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    # Configure per environment
    # bucket         = "veteranfinder-terraform-state"
    # key            = "terraform.tfstate"
    # region         = "us-east-1"
    # encrypt        = true
    # dynamodb_table = "veteranfinder-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "VeteranFinder"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Random suffix for unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}

# Local values
locals {
  name_prefix = "vf-${var.environment}"
  common_tags = {
    Project     = "VeteranFinder"
    Environment = var.environment
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  name_prefix         = local.name_prefix
  vpc_cidr            = var.vpc_cidr
  availability_zones  = slice(data.aws_availability_zones.available.names, 0, 3)
  environment         = var.environment
}

# RDS PostgreSQL Module
module "rds" {
  source = "./modules/rds"

  name_prefix           = local.name_prefix
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  db_instance_class     = var.db_instance_class
  db_allocated_storage  = var.db_allocated_storage
  db_name               = var.db_name
  db_username           = var.db_username
  db_password           = var.db_password
  environment           = var.environment
  
  # Allow connections from ECS tasks
  allowed_security_groups = [module.ecs.ecs_security_group_id]
}

# ElastiCache Redis Module
module "redis" {
  source = "./modules/redis"

  name_prefix          = local.name_prefix
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_nodes
  environment          = var.environment
  
  # Allow connections from ECS tasks
  allowed_security_groups = [module.ecs.ecs_security_group_id]
}

# S3 Module for uploads
module "s3" {
  source = "./modules/s3"

  name_prefix  = local.name_prefix
  environment  = var.environment
  random_suffix = random_id.suffix.hex
}

# Application Load Balancer Module
module "alb" {
  source = "./modules/alb"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  certificate_arn    = var.ssl_certificate_arn
  environment        = var.environment
}

# ECS Module
module "ecs" {
  source = "./modules/ecs"

  name_prefix          = local.name_prefix
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  alb_target_group_arn = module.alb.api_target_group_arn
  alb_security_group_id = module.alb.alb_security_group_id
  
  # Container configuration
  api_image            = var.api_image
  api_cpu              = var.api_cpu
  api_memory           = var.api_memory
  api_desired_count    = var.api_desired_count
  
  web_image            = var.web_image
  web_cpu              = var.web_cpu
  web_memory           = var.web_memory
  web_desired_count    = var.web_desired_count
  
  # Environment variables
  environment_variables = {
    NODE_ENV                = var.environment
    DATABASE_URL            = module.rds.connection_string
    REDIS_URL               = module.redis.connection_string
    AWS_S3_BUCKET           = module.s3.bucket_name
    AWS_REGION              = var.aws_region
    JWT_SECRET              = var.jwt_secret
    JWT_REFRESH_SECRET      = var.jwt_refresh_secret
    ENCRYPTION_KEY          = var.encryption_key
    SMTP_HOST               = var.smtp_host
    SMTP_PORT               = var.smtp_port
    SMTP_USER               = var.smtp_user
    SMTP_PASS               = var.smtp_pass
    FROM_EMAIL              = var.from_email
    FRONTEND_URL            = "https://${var.domain_name}"
    API_URL                 = "https://api.${var.domain_name}"
  }
  
  environment = var.environment
}

# CloudFront Distribution (optional, for CDN)
module "cloudfront" {
  source = "./modules/cloudfront"
  count  = var.enable_cloudfront ? 1 : 0

  name_prefix         = local.name_prefix
  s3_bucket_domain    = module.s3.bucket_regional_domain_name
  alb_domain_name     = module.alb.alb_dns_name
  domain_name         = var.domain_name
  certificate_arn     = var.cloudfront_certificate_arn
  environment         = var.environment
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.alb_dns_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = module.s3.bucket_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = var.enable_cloudfront ? module.cloudfront[0].distribution_id : null
}
