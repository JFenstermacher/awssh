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
	DefaultLogin    string
	KeysDirectory   string
	SSMEnabled      bool
	TemplateString  string
}

func LoadConfig(home string) {
	viper.AddConfigPath(filepath.Join(home, ".awsshgo"))
	viper.SetConfigType("yaml")
	viper.SetConfigName("config")

	viper.AutomaticEnv() // read in environment variables that match

	// If a config file is found, read it in.
	if err := viper.ReadInConfig(); err == nil {
		fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
	} else {
		viper.SetDefault("BaseCommand", "ssh")
		viper.SetDefault("ConnectionOrder", []string{"PUBLIC", "PRIVATE"})
		viper.SetDefault("DefaultLogin", "ec2-user")
		viper.SetDefault("KeysDirectory", filepath.Join(home, ".ssh"))
		viper.SetDefault("SSMEnabled", false)
		viper.SetDefault("TemplateString", "{{ .Tags.Name }} [{{ .InstanceId }}]")
	}
}

func WriteConfig() {
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

func GetDefaultLogin() string {
	user := viper.GetString("DefaultLogin")

	if user == "" {
		log.Fatal("No configuration found for [DefaultLogin]")
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
