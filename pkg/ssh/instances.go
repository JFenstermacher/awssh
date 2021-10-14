package ssh

import (
	"bytes"
	"errors"
	"log"
	"text/template"

	"github.com/AlecAivazis/survey/v2"
	"github.com/JFenstermacher/awssh/pkg/config"
	inst "github.com/JFenstermacher/awssh/pkg/instances"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/spf13/viper"
)

type GetInstancesInput struct {
	Session *session.Session
	SSM     bool
	Filter  func(instance inst.Instance) bool
}

func GetInstances(input GetInstancesInput) []inst.Instance {
	associated := map[string]interface{}{}
	instances := []inst.Instance{}

	if input.Session == nil {
		log.Fatal("Valid AWS session must be passed")
	}

	instanceChan := inst.GetInstancesChannel(input.Session)

	if input.SSM {
		infoChan := inst.GetInstanceInfoChannel(input.Session)

		for info := range infoChan {
			if *info.AssociationStatus == "Success" {
				associated[*info.InstanceId] = nil
			}
		}
	}

	for i := range instanceChan {
		_, found := associated[*i.InstanceId]

		instance := inst.Instance{
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
			Tags:             inst.RemapTags(i.Tags),
		}

		if input.Filter != nil && input.Filter(instance) {
			instances = append(instances, instance)
		}
	}

	if len(instances) == 0 {
		log.Fatal("No instances found")
	}

	return instances
}

func getInstanceLabels(instances *[]inst.Instance, templateString string) ([]string, map[string]inst.Instance) {
	it, err := template.New("instance").Parse(templateString)

	if err != nil {
		log.Fatal(err)
	}

	labels, mapping := []string{}, map[string]inst.Instance{}
	for _, instance := range *instances {
		var label bytes.Buffer

		if err := it.Execute(&label, instance); err != nil {
			log.Fatal(err)
		}

		key := label.String()

		labels = append(labels, key)
		mapping[key] = instance
	}

	return labels, mapping
}

func SelectInstance(instances *[]inst.Instance) inst.Instance {
	templateString := config.GetTemplateString()

	if templateString == "" {
		log.Fatal("Template String is not defined. Please reinitialize configuration.")
	}

	choice := ""

	labels, mapping := getInstanceLabels(instances, templateString)

	prompt := &survey.Select{
		Message: "Choose an instance",
		Options: labels,
	}

	validator := func(val interface{}) error {
		key, ok := val.(string)

		if !ok {
			return errors.New("Instance key passed not readable")
		}

		instance := mapping[key]

		if instance.State != "Running" {
			return errors.New("The chosen instance is not running")
		}

		return nil
	}

	if err := survey.AskOne(prompt, &choice, survey.WithValidator(validator)); err != nil {
		log.Fatal(err)
	}

	return mapping[choice]
}

func PromptInstance() inst.Instance {
	profile, region := viper.GetString("profile"), viper.GetString("region")
	session := inst.GetSession(profile, region)

	ssm := config.GetSSMEnabled()

	instances := GetInstances(GetInstancesInput{
		Session: session,
		SSM:     ssm && viper.GetBool("ssm"),
		Filter: func(instance inst.Instance) bool {
			ssm, pub := viper.GetBool("ssm"), viper.GetBool("pub")

			if ssm {
				return instance.SSMEnabled
			}

			if pub {
				return instance.PublicIpAddress != ""
			}

			return true
		},
	})

	return SelectInstance(&instances)
}
