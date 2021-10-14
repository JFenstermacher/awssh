package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

type Configuration struct {
	BaseCommand     string
	ConnectionOrder []string
	DefaultUser     string
	KeysDirectory   string
	SSMEnabled      bool
	TemplateString  string
}

func Load(home string) {
	// Search config in home directory with name ".awssh" (without extension).
	viper.AddConfigPath(home)
	viper.SetConfigType("yaml")
	viper.SetConfigName(".awsshgo")

	viper.AutomaticEnv() // read in environment variables that match

	// If a config file is found, read it in.
	if err := viper.ReadInConfig(); err == nil {
		fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
	} else {
		viper.SetDefault("BaseCommand", "ssh")
		viper.SetDefault("ConnectionOrder", []string{"PUBLIC", "PRIVATE"})
		viper.SetDefault("DefaultUser", "ec2-user")
		viper.SetDefault("KeysDirectory", filepath.Join(home, ".ssh"))
		viper.SetDefault("SSMEnabled", false)
		viper.SetDefault("TemplateString", "{{ .Tags.Name }} [{{ .InstanceId }}]")
	}
}

func Write() {
	viper.WriteConfig()
}

func GetBaseCommand() string {
	cmd := viper.GetString("BaseCommand")

	if cmd == "" {
		log.Fatal("No Base Command found.")
	}

	return cmd
}

func GetConnectionOrder() []string {
	connections := viper.GetStringSlice("ConnectionOrder")

	if len(connections) == 0 {
		log.Fatal("No configuration found for [ConnectionOrder]")
	}

	return connections
}

func GetDefaultUser() string {
	user := viper.GetString("DefaultUser")

	if user == "" {
		log.Fatal("No configuration found for [DefaultUser]")
	}

	return user
}

func GetKeysDirectory() string {
	dir := viper.GetString("KeysDirectory")

	if dir == "" {
		log.Fatal("No configuration found for [KeysDirectory]")
	}

	return dir
}

func GetSSMEnabled() bool {
	return viper.GetBool("SSMEnabled")
}

func GetTemplateString() string {
	template := viper.GetString("TemplateString")

	if template == "" {
		log.Fatal("No configuration found for [TemplateString]")
	}

	return template
}
