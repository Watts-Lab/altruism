provider "aws" {
  region = "us-east-1"
}

# Initializing AWS credentials for MTurk Account
variable "aws_access_key_id" {
  description = "AWS Access Key ID"
}
variable "aws_secret_access_key" {
  description = "AWS Secret Access Key"
}

# Initializing list of workers for sharers 
variable "sharer_ids" {
  description = "Worker IDs for sharers"
}

# Creating DynamoDB tables for sharing workflow

# Table of workers who are sharers 
resource "aws_dynamodb_table" "sharers" {
  name           = "altruism_sharers"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "workerID"
  attribute {
    name = "workerID"
    type = "S"
  }
}

# Table of shareIDs and treatments of each sharer
resource "aws_dynamodb_table" "sharing_data" {
  name           = "altruism_sharing_data"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "shareID"
  attribute {
    name = "shareID"
    type = "S"
  }
}

# Table of all workerIDs and their HITs 
resource "aws_dynamodb_table" "worker_info" {
  name           = "altruism_worker_info"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "workerID"
  attribute {
    name = "workerID"
    type = "S"
  }
}

# Table of sharing relationships between workers
resource "aws_dynamodb_table" "worker_relationships" {
  name           = "altruism_worker_relationships"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "receiverWorkerID"
  attribute {
    name = "receiverWorkerID"
    type = "S"
  }
  attribute {
    name = "sharerWorkerID"
    type = "S"
  }
  global_secondary_index {
    name               = "sharerWorkerIDIndex"
    hash_key           = "sharerWorkerID"
    projection_type    = "ALL"
    read_capacity      = 5
    write_capacity     = 5
  }
}

# Creating DDBs for storing data from HITs 

# Table that stores all available tasks
resource "aws_dynamodb_table" "available_HITs" {
  name           = "altruism_available_tasks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "receiverWorkerID"
  attribute {
    name = "receiverWorkerID"
    type = "S"
  }
}

# Initialize specific tasks/surveys 
variable "task_names" {
  type    = list(string)
  default = ["ExampleTask", "NewWorkerSurvey"]  # TO-DO: Add task names
}

# Initialize table for each task
resource "aws_dynamodb_table" "altruism_tables" {
  for_each = { for entry in var.task_names : entry => "altruism_${entry}" }

  name           = each.value
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "taskID"

  attribute {
    name = "taskID"
    type = "S"
  }
}

# Initializing SNS topics 
resource "aws_sns_topic" "create_HITs_topic" {
  name = "altruism_createHITs"
}

resource "aws_sns_topic" "delete_HITs_topic" {
  name = "altruism_deleteHITs"
}

resource "aws_sns_topic" "delete_HITs_sharer_topic" {
  name = "altruism_deleteHITs_sharer"
}

# Initializing lambda functions 

# Define an IAM role for the Lambda function
resource "aws_iam_role" "lambda_execution_role" {
  name = "altruism-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        },
      },
    ],
  })
}

# Attach an IAM policy to allow DynamoDB access
resource "aws_iam_policy" "dynamodb_policy" {
  name        = "dynamodb-policy"
  description = "IAM policy for DynamoDB access"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action   = "dynamodb:*",
        Effect   = "Allow",
        Resource = "*",
      },
    ],
  })
}

# Attach an IAM policy to allow MTurk access
resource "aws_iam_policy" "mturk_policy" {
  name        = "mturk-policy"
  description = "IAM policy for MTurk access"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action   = "mturk:*",
        Effect   = "Allow",
        Resource = "*",
      },
    ],
  })
}

# Attach policies to the IAM role
resource "aws_iam_role_policy_attachment" "lambda_dynamodb_attachment" {
  policy_arn = aws_iam_policy.dynamodb_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_mturk_attachment" {
  policy_arn = aws_iam_policy.mturk_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}

# Lambda for initializing cost treatments 
resource "aws_lambda_function" "initialize_treatments" {
  function_name    = "altruism_initializeCostTreatment"
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.lambda_execution_role.arn
  filename         = "initializeCostTreatment.zip"  
  source_code_hash = filebase64("initializeCostTreatment.zip")
}

# Lambda for creating sharer HITs 
resource "aws_lambda_function" "create_HITs" {
  function_name    = "altruism_createHITs"
  handler          = "index.handler"
  runtime          = "nodejs16.x"
  role             = aws_iam_role.lambda_execution_role.arn
  filename         = "create_HITs.zip"  
  source_code_hash = filebase64("create_HITs.zip")
  timeout = 60

  depends_on = [aws_sns_topic.create_HITs_topic]
}

# Lambda for deleting receiver HITs 
resource "aws_lambda_function" "delete_HITs" {
  function_name    = "altruism_deleteHITs"
  handler          = "index.handler"
  runtime          = "nodejs16.x"
  role             = aws_iam_role.lambda_execution_role.arn
  filename         = "delete_receiver.zip"  
  source_code_hash = filebase64("delete_receiver.zip")
  
  depends_on = [aws_sns_topic.delete_HITs_topic]
}

# Lambda for deleting sharer HITs 
resource "aws_lambda_function" "delete_HITs_sharer" {
  function_name    = "altruism_deleteHITs_sharer"
  handler          = "index.handler"
  runtime          = "nodejs16.x"
  role             = aws_iam_role.lambda_execution_role.arn
  filename         = "delete_sharer.zip"  
  source_code_hash = filebase64("delete_sharer.zip")
  
  depends_on = [aws_sns_topic.delete_HITs_sharer_topic]
}

# Subscribing lambdas to SNS 
resource "aws_sns_topic_subscription" "sns_create_HITs_subscription" {
  topic_arn = aws_sns_topic.create_HITs_topic.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.create_HITs.arn
}

resource "aws_sns_topic_subscription" "sns_delete_HITs_subscription" {
  topic_arn = aws_sns_topic.delete_HITs_topic.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.delete_HITs.arn
}

resource "aws_sns_topic_subscription" "sns_delete_HITs_sharer_subscription" {
  topic_arn = aws_sns_topic.delete_HITs_sharer_topic.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.delete_HITs_sharer.arn
}

# Initializing API Gateway 
resource "aws_api_gateway_rest_api" "initialize_treatments" {
  name        = "altruism-initializeCostTreatment-api"
  description = "API called to determine treatment for each sharer"
}

resource "aws_api_gateway_resource" "initialize_treatments_resource" {
  rest_api_id = aws_api_gateway_rest_api.initialize_treatments.id
  parent_id   = aws_api_gateway_rest_api.initialize_treatments.root_resource_id
  path_part   = "initialize"
}

resource "aws_api_gateway_method" "initialize_treatments_method" {
  rest_api_id   = aws_api_gateway_rest_api.initialize_treatments.id
  resource_id   = aws_api_gateway_resource.initialize_treatments_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "initialize_treatments_integration" {
  rest_api_id             = aws_api_gateway_rest_api.initialize_treatments.id
  resource_id             = aws_api_gateway_resource.initialize_treatments_resource.id
  http_method             = aws_api_gateway_method.initialize_treatments_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.initialize_treatments.invoke_arn
}

resource "aws_api_gateway_deployment" "initialize_treatments" {
  depends_on = [aws_api_gateway_integration.initialize_treatments_integration]

  rest_api_id = aws_api_gateway_rest_api.initialize_treatments.id
  stage_name  = "prod"
}

output "api_gateway_url" {
  value = aws_api_gateway_deployment.initialize_treatments.invoke_url
}

# Running script to make global HIT 
resource "null_resource" "initialize_global_HIT" {
  provisioner "local-exec" {
    command = "node initializeGlobalHIT.js"
    environment = {
      AWS_ACCESS_KEY_ID     = var.aws_access_key_id,
      AWS_SECRET_ACCESS_KEY = var.aws_secret_access_key,
      SNS_DESTINATION       = aws_sns_topic.delete_HITs_topic.arn,
    }
  }
  depends_on = [aws_lambda_function.delete_HITs, aws_sns_topic.delete_HITs_topic]
}

# Running script to make sharer HITs
resource "null_resource" "initialize_sharer_HITs" {
  provisioner "local-exec" {
    command = "node initializeSharerHITs.js '${jsonencode(var.sharer_ids)}'"
    environment = {
      AWS_ACCESS_KEY_ID     = var.aws_access_key_id,
      AWS_SECRET_ACCESS_KEY = var.aws_secret_access_key,
      SNS_DESTINATION       = aws_sns_topic.delete_HITs_sharer_topic.arn,
    }
  }
  depends_on = [aws_lambda_function.delete_HITs_sharer, aws_sns_topic.delete_HITs_sharer_topic]
}
