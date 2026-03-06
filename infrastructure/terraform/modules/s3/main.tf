# S3 Module for uploads

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "random_suffix" {
  type = string
}

# Uploads bucket
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.name_prefix}-uploads-${var.random_suffix}"

  tags = {
    Name = "${var.name_prefix}-uploads"
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Versioning (for prod)
resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = var.environment == "prod" ? "Enabled" : "Disabled"
  }
}

# Lifecycle rules
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "verification-cleanup"
    status = "Enabled"

    filter {
      prefix = "verification/"
    }

    expiration {
      days = 30
    }
  }

  rule {
    id     = "temp-cleanup"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 1
    }
  }

  # For versioned buckets, clean up old versions
  dynamic "rule" {
    for_each = var.environment == "prod" ? [1] : []
    content {
      id     = "version-cleanup"
      status = "Enabled"

      filter {
        prefix = ""
      }

      noncurrent_version_expiration {
        noncurrent_days = 90
      }
    }
  }
}

# CORS configuration for presigned URLs
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = var.environment == "prod" ? ["https://*.veteranfinder.com"] : ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Bucket policy for CloudFront (if needed)
resource "aws_s3_bucket_policy" "uploads" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = aws_s3_bucket.uploads.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceTLS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.uploads.arn,
          "${aws_s3_bucket.uploads.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# Outputs
output "bucket_name" {
  value = aws_s3_bucket.uploads.id
}

output "bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}

output "bucket_regional_domain_name" {
  value = aws_s3_bucket.uploads.bucket_regional_domain_name
}
