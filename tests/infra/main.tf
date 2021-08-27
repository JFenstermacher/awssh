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

provider "aws" {}
provider "tls" {}

locals {
  prefix = "awssh-test"
}

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
  filename        = "${local.prefix}.pem"
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

resource "aws_instance" "test" {
  count = 3

  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t2.micro"
  associate_public_ip_address = true
  key_name                    = aws_key_pair.test.key_name
  vpc_security_group_ids      = [aws_security_group.test.id]

  tags = {
    Name = "prefix-${count.index}"
  }
}
