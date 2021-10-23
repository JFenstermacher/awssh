package ssh

import (
	"log"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/JFenstermacher/awssh/pkg/config"
	inst "github.com/JFenstermacher/awssh/pkg/instances"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"
)

func GetLoginName(flags *pflag.FlagSet) []string {
	loginName, _ := flags.GetString("loginName")

	if loginName == "" {
		loginName = config.GetDefaultUser()
	}

	if loginName == "" {
		log.Fatal("No login name found. Reinitialize CLI.")
	}

	return []string{"-l", loginName}
}

func GetTarget(flags *pflag.FlagSet, instance *inst.Instance) string {
	conns := config.GetConnectionOrder()

	if len(conns) == 0 {
		log.Fatal("No connections in ConnectionOrder. Reinitialize CLI.")
	}

	if ssm, _ := flags.GetBool("ssm"); ssm {
		return instance.InstanceId
	}

	if pub, _ := flags.GetBool("pub"); pub {
		return instance.PublicIpAddress
	}

	if priv, _ := flags.GetBool("priv"); priv {
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

func GetPort(flags *pflag.FlagSet) []string {
	port, _ := flags.GetInt("port")

	return []string{"-p", strconv.Itoa(port)}
}

func GetOptions(flags *pflag.FlagSet) []string {
	opts, _ := flags.GetStringSlice("option")

	options := []string{}

	for _, opt := range opts {
		options = append(options, "-o", opt)
	}

	return options
}

func GetBaseFlags() []string {
	arr := []string{}

	flags := viper.GetString("BaseFlags")

	if flags != "" {
		arr = append(arr, flags)
	}

	return arr
}

func GetKey(key string) []string {
	if key == "" {
		return []string{}
	}

	return []string{"-i", key}
}

func generateCmd(flags *pflag.FlagSet, instance *inst.Instance, key string) (string, []string) {
	cmd := "ssh"

	components := GetBaseFlags()
	components = append(components, GetOptions(flags)...)
	components = append(components, GetKey(key)...)
	components = append(components, GetPort(flags)...)
	components = append(components, GetLoginName(flags)...)
	components = append(components, GetTarget(flags, instance))

	log.Println(cmd, strings.Join(components, " "))

	return cmd, components
}

func SSH(flags *pflag.FlagSet, instance *inst.Instance, key string) {
	base, components := generateCmd(flags, instance, key)

	cmd := exec.Command(base, components...)

	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		log.Fatal(err)
	}
}
