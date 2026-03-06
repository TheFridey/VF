# ElastiCache Redis Module

variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "node_type" {
  type = string
}

variable "num_cache_nodes" {
  type = number
}

variable "environment" {
  type = string
}

variable "allowed_security_groups" {
  type    = list(string)
  default = []
}

# Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.name_prefix}-redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.name_prefix}-redis-subnet-group"
  }
}

# Security Group
resource "aws_security_group" "redis" {
  name        = "${var.name_prefix}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.name_prefix}-redis-sg"
  }
}

resource "aws_security_group_rule" "redis_ingress" {
  count                    = length(var.allowed_security_groups)
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = var.allowed_security_groups[count.index]
  security_group_id        = aws_security_group.redis.id
}

resource "aws_security_group_rule" "redis_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.redis.id
}

# Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7"
  name   = "${var.name_prefix}-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = {
    Name = "${var.name_prefix}-redis-params"
  }
}

# Redis Cluster (single node for dev/staging, replication group for prod)
resource "aws_elasticache_cluster" "main" {
  count = var.environment != "prod" ? 1 : 0

  cluster_id           = "${var.name_prefix}-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.node_type
  num_cache_nodes      = 1
  parameter_group_name = aws_elasticache_parameter_group.main.name
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  snapshot_retention_limit = 0

  tags = {
    Name = "${var.name_prefix}-redis"
  }
}

# Redis Replication Group (for prod with failover)
resource "aws_elasticache_replication_group" "main" {
  count = var.environment == "prod" ? 1 : 0

  replication_group_id       = "${var.name_prefix}-redis"
  description                = "Redis replication group for ${var.name_prefix}"
  node_type                  = var.node_type
  num_cache_clusters         = var.num_cache_nodes
  parameter_group_name       = aws_elasticache_parameter_group.main.name
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  
  automatic_failover_enabled = var.num_cache_nodes > 1
  multi_az_enabled           = var.num_cache_nodes > 1
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  snapshot_retention_limit = 7
  snapshot_window          = "03:00-04:00"
  maintenance_window       = "Mon:04:00-Mon:05:00"

  tags = {
    Name = "${var.name_prefix}-redis"
  }
}

# Outputs
output "endpoint" {
  value = var.environment == "prod" ? aws_elasticache_replication_group.main[0].primary_endpoint_address : aws_elasticache_cluster.main[0].cache_nodes[0].address
}

output "port" {
  value = 6379
}

output "connection_string" {
  value     = var.environment == "prod" ? "redis://${aws_elasticache_replication_group.main[0].primary_endpoint_address}:6379" : "redis://${aws_elasticache_cluster.main[0].cache_nodes[0].address}:6379"
  sensitive = true
}

output "security_group_id" {
  value = aws_security_group.redis.id
}
