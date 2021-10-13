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

func GetInstances(sess *session.Session, ssm bool) []Instance {
	associated := map[string]interface{}{}
	instances := []Instance{}

	if ssm {
		infoChan := GetInstanceInfoChannel(sess)

		for info := range infoChan {
			if *info.AssociationStatus == "Success" {
				associated[*info.InstanceId] = nil
			}
		}
	}

	instanceChan := GetInstancesChannel(sess)

	for i := range instanceChan {
		_, found := associated[*i.InstanceId]

		instance := Instance{
			ImageId:          *i.ImageId,
			InstanceId:       *i.InstanceId,
			InstanceType:     *i.InstanceType,
			KeyName:          *i.KeyName,
			PrivateIpAddress: *i.PrivateIpAddress,
			PublicIpAddress:  *i.PublicIpAddress,
			SubnetId:         *i.SubnetId,
			VpcId:            *i.VpcId,
			State:            *i.State.Name,
			SSMEnabled:       found,
			Tags:             remapTags(i.Tags),
		}

		instances = append(instances, instance)
	}

	return instances
}

func FilterSSMOnly(instances []Instance) []Instance {
	filtered := []Instance{}

	for _, instance := range instances {
		if instance.SSMEnabled {
			filtered = append(filtered, instance)
		}
	}

	return filtered
}

func FilterPublicOnly(instances []Instance) []Instance {
	filtered := []Instance{}

	for _, instance := range instances {
		if instance.PublicIpAddress != "" {
			filtered = append(filtered, instance)
		}
	}

	return filtered
}

func remapTags(tags []*ec2.Tag) map[string]string {
	remapped := map[string]string{}

	for _, tag := range tags {
		remapped[*tag.Key] = *tag.Value
	}

	return remapped
}
