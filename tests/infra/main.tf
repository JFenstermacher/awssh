terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "3.56.0"
    }
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name = "name"
    values = ["amzn2-ami-hvm*"]
  }
}

resource "aws_instance" "test" {
  count = 3

  ami = data.aws_ami.amazon_linux.id
  instance_type = "t2.micro"

  tags = {
    Name = "test-server-${count.index}"
  }
}
