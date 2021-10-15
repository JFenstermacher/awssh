package ssh

import (
	"log"

	"github.com/JFenstermacher/awssh/pkg/config"
	inst "github.com/JFenstermacher/awssh/pkg/instances"
	"github.com/spf13/viper"
)

func GetLoginName() string {
	loginName := viper.GetString("loginName")

	if loginName != "" {
		return loginName
	}

	loginName = config.GetDefaultLogin()

	if loginName == "" {
		log.Fatal("No login name found. Reinitialize CLI.")
	}

	return loginName
}

func GetTarget(instance *inst.Instance) string {
	conns := config.GetConnectionOrder()

	if len(conns) == 0 {
		log.Fatal("No connections in ConnectionOrder. Reinitialize CLI.")
	}

	if viper.GetBool("ssm") {
		return instance.InstanceId
	}

	if viper.GetBool("pub") {
		return instance.PublicIpAddress
	}

	if viper.GetBool("priv") {
		return instance.PrivateIpAddress
	}

	target := ""

	for _, conn := range conns {
		switch conn {
		case "SSM":
			if instance.SSMEnabled {
				target = instance.InstanceId
			}
		case "PUBLIC":
			if instance.PublicIpAddress != "" {
				target = instance.PublicIpAddress
			}
		default:
			target = instance.PrivateIpAddress
		}

		if target != "" {
			break
		}
	}

	return target
}
