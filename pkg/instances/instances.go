package instances

import (
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/aws/aws-sdk-go/service/ssm"
)

type Instance struct {
	ImageId          string
	InstanceId       string
	InstanceType     string
	KeyName          string
	PrivateIpAddress string
	PublicIpAddress  string
	SubnetId         string
	VpcId            string
	SSMEnabled       bool
	State            string
	Tags             map[string]string
}

func GetInstancesChannel(sess *session.Session) <-chan *ec2.Instance {
	c := make(chan *ec2.Instance)

	channelInstances := func() {
		svc := ec2.New(sess)

		svc.DescribeInstancesPages(&ec2.DescribeInstancesInput{},
			func(page *ec2.DescribeInstancesOutput, lastPage bool) bool {
				for _, res := range page.Reservations {
					for _, inst := range res.Instances {
						c <- inst
					}
				}

				return !lastPage
			})

		close(c)
	}

	go channelInstances()

	return c
}

func GetInstanceInfoChannel(sess *session.Session) <-chan *ssm.InstanceInformation {
	c := make(chan *ssm.InstanceInformation)

	channelInstanceInfo := func() {
		svc := ssm.New(sess)

		svc.DescribeInstanceInformationPages(&ssm.DescribeInstanceInformationInput{},
			func(page *ssm.DescribeInstanceInformationOutput, lastPage bool) bool {
				for _, info := range page.InstanceInformationList {
					if *info.AssociationStatus == "Status" {
						c <- info
					}
				}

				return !lastPage
			})

		close(c)
	}

	go channelInstanceInfo()

	return c
}

func RemapTags(tags []*ec2.Tag) map[string]string {
	remapped := map[string]string{}

	for _, tag := range tags {
		remapped[*tag.Key] = *tag.Value
	}

	if _, found := remapped["Name"]; !found {
		remapped["Name"] = "No Name"
	}

	return remapped
}
