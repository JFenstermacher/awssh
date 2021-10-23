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

type ConfigPath struct {
	Dir  string
	Ext  string
	Name string
	Path string
}

func GetConfigPath() *ConfigPath {
	home := viper.GetString("home")

	dir := filepath.Join(home, ".awsshgo")

	return &ConfigPath{
		Dir:  dir,
		Ext:  "yaml",
		Name: "config",
		Path: filepath.Join(dir, "config.yaml"),
	}
}

func LoadConfig() {
	configpath := GetConfigPath()

	viper.AddConfigPath(configpath.Dir)
	viper.SetConfigType(configpath.Ext)
	viper.SetConfigName(configpath.Name)

	viper.AutomaticEnv() // read in environment variables that match

	home := viper.GetString("home")

	// If a config file is found, read it in.
	if err := viper.ReadInConfig(); err == nil {
		fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
	} else {
		viper.SetDefault("BaseFlags", "")
		viper.SetDefault("ConnectionOrder", []string{"PUBLIC", "PRIVATE"})
		viper.SetDefault("DefaultUser", "ec2-user")
		viper.SetDefault("KeysDirectory", filepath.Join(home, ".ssh"))
		viper.SetDefault("SSMEnabled", false)
		viper.SetDefault("TemplateString", "{{ .Tags.Name }} [{{ .InstanceId }}]")
	}
}

func WriteConfig() {
	configpath := GetConfigPath()

	os.Mkdir(configpath.Dir, 0755)

	if err := viper.WriteConfigAs(configpath.Path); err != nil {
		log.Fatal(err)
	}
}

func GetBaseFlags() string {
	flags := viper.GetString("BaseFlags")

	return flags
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
