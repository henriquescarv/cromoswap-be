variable "aws_region" {
  default = "us-east-1"
}

variable "account_id" {
  default = "166270484589"
}

variable "vpc_id" {
  default = "vpc-0d2f9cddaeba8c145"
}

variable "subnets" {
  default = [
    "subnet-0970498c75f33e064",
    "subnet-0b26f3e90650918fb"
  ]
}

variable "rds_sg_id" {
  default = "sg-0c0e53d2aeac59bf8"
}

variable "ecr_repository" {
  default = "cromoswap"
}

variable "app_port" {
  default = 3000
}

variable "db_host" {
  default = "cromoswap.csl2w0ewcke3.us-east-1.rds.amazonaws.com"
}

variable "db_name" {
  default = "cromoswapdb"
}

variable "db_user" {
  default = "cromoswap"
}

variable "db_password" {
  sensitive = true
  default   = "Q2R<_9|gq]:X9N7lG7|KeQDL9>jb"
}

variable "jwt_secret" {
  sensitive = true
  default   = "your_secret_key"
}

variable "jwt_expires_in" {
  default = "1h"
}

variable "resend_api_key" {
  sensitive = true
  default   = "re_WPS9qPdy_BsNzMjqMFTpbCE2T25JrCkC2"
}

variable "aws_access_key_id" {
  sensitive = true
}

variable "aws_secret_access_key" {
  sensitive = true
}

variable "aws_s3_bucket_name" {
  default = "cromoswap-images"
}
