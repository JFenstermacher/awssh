package ssh

import (
	"log"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/JFenstermacher/awssh/pkg/config"
	inst "github.com/JFenstermacher/awssh/pkg/instances"
	"github.com/spf13/viper"
)

func GetLoginName() []string {
	loginName := viper.GetString("loginName")

	if loginName == "" {
		loginName = config.GetDefaultLogin()
	}

	if loginName == "" {
		log.Fatal("No login name found. Reinitialize CLI.")
	}

	return []string{"-l", loginName}
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

func GetPort() []string {
	port := viper.GetInt("port")

	return []string{"-p", strconv.Itoa(port)}
}

func GetOptions() []string {
	opts := viper.GetStringSlice("option")

	options := []string{}

	for _, opt := range opts {
		options = append(options, "-o", opt)
	}

	return options
}

func generateCmd(instance *inst.Instance, key string) (string, []string) {
	base := viper.GetString("BaseCommand")

	components := GetOptions()
	components = append(components, "-i", key)
	components = append(components, GetPort()...)
	components = append(components, GetLoginName()...)
	components = append(components, GetTarget(instance))

	log.Println(base, strings.Join(components, " "))

	return base, components
}

func SSH(instance *inst.Instance, key string) {
	base, components := generateCmd(instance, key)

	cmd := exec.Command(base, components...)

	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		log.Fatal(err)
	}
}
