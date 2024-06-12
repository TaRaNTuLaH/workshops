provider "aws" {
  region = "eu-west-1"
}

resource "aws_s3_bucket" "workshops" {
  bucket = "tofu-workshops"
  
  website {
    index_document = "index.html"
  }
}

resource "aws_s3_bucket_ownership_controls" "ownership_controls" {
  bucket = aws_s3_bucket.workshops.id

  rule {
    object_ownership = "ObjectWriter"
  }
}

resource "aws_s3_bucket_public_access_block" "public_access_block" {
  bucket = aws_s3_bucket.workshops.id

  block_public_acls = false
}

resource "aws_s3_bucket_object" "index_html" {
  bucket = aws_s3_bucket.workshops.id
  key    = "index.html"
  source = "./index.html"
  content_type = "text/html"
  acl = "public-read"
  
  depends_on = [
    aws_s3_bucket_public_access_block.public_access_block,
    aws_s3_bucket_ownership_controls.ownership_controls
  ]
}

output "bucket_name" {
  value = aws_s3_bucket.workshops.id
}

output "bucket_endpoint" {
  value = "http://${aws_s3_bucket.workshops.website_endpoint}"
}

resource "aws_iam_user" "s3User" {
  name = "s3User"
  tags = {
    workshop = "true"
  }
}

resource "aws_iam_policy" "s3UserPolicy" {
  name        = "s3UserPolicy"
  description = "Policy for S3 access"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = [aws_s3_bucket.workshops.arn]
      },
      {
        Effect   = "Allow"
        Action   = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = ["${aws_s3_bucket.workshops.arn}/*"]
      }
    ]
  })
}

resource "aws_iam_user_policy_attachment" "s3UserPolicyAttachment" {
  user       = aws_iam_user.s3User.name
  policy_arn = aws_iam_policy.s3UserPolicy.arn
}

resource "aws_iam_access_key" "s3UserAccessKey" {
  user = aws_iam_user.s3User.name
}

output "accessKeyId" {
  value = aws_iam_access_key.s3UserAccessKey.id
}

output "secretAccessKey" {
  value = aws_iam_access_key.s3UserAccessKey.secret
  sensitive = true
}

resource "aws_vpc" "myVpc" {
  cidr_block       = "10.0.0.0/16"
  enable_dns_support = true
  enable_dns_hostnames = true
  tags = {
    Name = "myVpc"
  }
}

resource "aws_subnet" "subnet1" {
  vpc_id                  = aws_vpc.myVpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "eu-west-1a"
  map_public_ip_on_launch = true
  tags = {
    Name = "subnet1"
  }
}

resource "aws_subnet" "subnet2" {
  vpc_id                  = aws_vpc.myVpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "eu-west-1b"
  map_public_ip_on_launch = true
  tags = {
    Name = "subnet2"
  }
}

resource "aws_internet_gateway" "gateway" {
  vpc_id = aws_vpc.myVpc.id
  tags = {
    Name = "gateway"
  }
}

resource "aws_route_table" "routeTable" {
  vpc_id = aws_vpc.myVpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gateway.id
  }
  tags = {
    Name = "routeTable"
  }
}

resource "aws_route_table_association" "subnet1RouteTableAssociation" {
  subnet_id      = aws_subnet.subnet1.id
  route_table_id = aws_route_table.routeTable.id
}

resource "aws_route_table_association" "subnet2RouteTableAssociation" {
  subnet_id      = aws_subnet.subnet2.id
  route_table_id = aws_route_table.routeTable.id
}

resource "aws_db_subnet_group" "dbsubnetgroup" {
  name       = "dbsubnetgroup"
  subnet_ids = [aws_subnet.subnet1.id, aws_subnet.subnet2.id]
  tags = {
    Name = "My DB subnet group"
  }
}

resource "aws_security_group" "dbSecurityGroup" {
  name        = "dbSecurityGroup"
  description = "Allow database access"
  vpc_id      = aws_vpc.myVpc.id

  ingress {
    protocol    = "tcp"
    from_port   = 5432
    to_port     = 5432
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "mydbinstance" {
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "14"
  instance_class       = "db.t3.micro"
  db_name                 = "workshop"
  username             = "dupa1234567890"
  password             = "super_tajne_haslo"
  db_subnet_group_name = aws_db_subnet_group.dbsubnetgroup.name
  vpc_security_group_ids = [aws_security_group.dbSecurityGroup.id]
  skip_final_snapshot  = true
  publicly_accessible  = true
}

output "dbEndpoint" {
  value = aws_db_instance.mydbinstance.endpoint
}