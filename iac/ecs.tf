# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/cromoswap"
  retention_in_days = 14

  tags = {
    Name = "cromoswap-logs"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "cromoswap-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "cromoswap-cluster"
  }
}

# Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "cromoswap"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  cpu                      = "768"
  memory                   = "400"

  container_definitions = jsonencode([{
    name      = "cromoswap"
    image     = "${var.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.ecr_repository}:latest"
    essential = true

    portMappings = [{
      containerPort = var.app_port
      hostPort      = 0
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV",       value = "production" },
      { name = "PORT",           value = tostring(var.app_port) },
      { name = "DB_HOST",        value = var.db_host },
      { name = "DB_NAME",        value = var.db_name },
      { name = "DB_USER",        value = var.db_user },
      { name = "DB_PASSWORD",    value = var.db_password },
      { name = "DB_PORT",        value = "5432" },
      { name = "DB_DIALECT",     value = "postgres" },
      { name = "DB_SSL",         value = "true" },
      { name = "JWT_SECRET",     value = var.jwt_secret },
      { name = "JWT_EXPIRES_IN", value = var.jwt_expires_in },
      { name = "RESEND_API_KEY", value = var.resend_api_key },
      { name = "AWS_REGION",         value = var.aws_region },
      { name = "AWS_ACCESS_KEY_ID",     value = var.aws_access_key_id },
      { name = "AWS_SECRET_ACCESS_KEY", value = var.aws_secret_access_key },
      { name = "AWS_S3_BUCKET_NAME",    value = var.aws_s3_bucket_name }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:${var.app_port}/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }
  }])
}

# ECS Service com spread por instância
resource "aws_ecs_service" "app" {
  name            = "cromoswap-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "cromoswap"
    container_port   = var.app_port
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_task_execution
  ]

  tags = {
    Name = "cromoswap-service"
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes = [
      capacity_provider_strategy
    ]
  }
}
