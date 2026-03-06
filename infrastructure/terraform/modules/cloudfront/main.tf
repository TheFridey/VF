# CloudFront Module

variable "name_prefix" {
  type = string
}

variable "s3_bucket_domain" {
  type = string
}

variable "alb_domain_name" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "certificate_arn" {
  type = string
}

variable "environment" {
  type = string
}

# Origin Access Identity for S3
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "${var.name_prefix} S3 OAI"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.name_prefix} distribution"
  default_root_object = ""
  price_class         = var.environment == "prod" ? "PriceClass_All" : "PriceClass_100"
  
  aliases = [var.domain_name, "www.${var.domain_name}"]

  # S3 Origin (for uploads/static assets)
  origin {
    domain_name = var.s3_bucket_domain
    origin_id   = "S3Origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  # ALB Origin (for dynamic content)
  origin {
    domain_name = var.alb_domain_name
    origin_id   = "ALBOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior (ALB)
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALBOrigin"

    forwarded_values {
      query_string = true
      headers      = ["Host", "Origin", "Authorization"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  # Static assets behavior (S3)
  ordered_cache_behavior {
    path_pattern     = "/uploads/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Origin"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }

  # Restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL Certificate
  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Custom error responses
  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404"
  }

  tags = {
    Name = "${var.name_prefix}-cloudfront"
  }
}

# Outputs
output "distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "distribution_arn" {
  value = aws_cloudfront_distribution.main.arn
}

output "oai_iam_arn" {
  value = aws_cloudfront_origin_access_identity.main.iam_arn
}
