terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "3.56.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~>3.1.0"
    }
  }
}

provider "aws" {
  region = local.region
}
provider "tls" {}

locals {
  region = "us-east-1"
  prefix = "awssh-test"
}

data "aws_caller_identity" "current" {}

data "http" "ip" {
  url = "http://icanhazip.com"
}

data "aws_vpc" "default" {
  default = true
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm*"]
  }
}

resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = "4096"
}

resource "local_file" "private_key" {
  content         = tls_private_key.ssh.private_key_pem
  filename        = "${aws_key_pair.test.key_name}.pem"
  file_permission = "0600"
}

resource "aws_key_pair" "test" {
  key_name_prefix = local.prefix
  public_key      = tls_private_key.ssh.public_key_openssh
}

resource "aws_security_group" "test" {
  name_prefix = local.prefix
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${chomp(data.http.ip.body)}/32"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "pub_test" {
  count = 2

  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t2.micro"
  associate_public_ip_address = true
  key_name                    = aws_key_pair.test.key_name
  vpc_security_group_ids      = [aws_security_group.test.id]

  tags = {
    Name = "${local.prefix}-pub-${count.index}"
  }
}

resource "aws_iam_role" "ssm_role" {
  name_prefix = "${local.prefix}-ssm-role"
  path        = "/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Effect = "Allow"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ssm_profile" {
  name_prefix = "${local.prefix}-ssm-instance-profile"
  role        = aws_iam_role.ssm_role.name
}

resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_instance" "ssm_test" {
  count = 2

  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t2.micro"
  associate_public_ip_address = true
  key_name                    = aws_key_pair.test.key_name
  vpc_security_group_ids      = [aws_security_group.test.id]
  iam_instance_profile        = aws_iam_instance_profile.ssm_profile.name

  tags = {
    Name = "${local.prefix}-ssm-${count.index}"
  }
}
