package config

import (
	"fmt"
	"log"
	"os"
	"os/exec"
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

func SetDefaults(reset bool) {
	home := viper.GetString("HOME")

	defaults := map[string]interface{}{
		"BaseFlags":       "",
		"ConnectionOrder": []string{"PUBLIC", "PRIVATE"},
		"DefaultUser":     "ec2-user",
		"KeysDirectory":   filepath.Join(home, ".ssh"),
		"SSMEnabled":      false,
		"TemplateString":  "{{ .Tags.Name }} [{{ .InstanceId }}]",
	}

	for key, value := range defaults {
		viper.SetDefault(key, value)

		if reset {
			viper.Set(key, value)
		}
	}
}

func LoadConfig() {
	viper.AutomaticEnv() // read in environment variables that match

	configpath := GetConfigPath()

	viper.AddConfigPath(configpath.Dir)
	viper.SetConfigType(configpath.Ext)
	viper.SetConfigName(configpath.Name)

	// If a config file is found, read it in.
	if err := viper.ReadInConfig(); err == nil {
		fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
	}

	SetDefaults(false)
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

func IsSSMPossible() bool {
	base, args := "session-manager-plugin", []string{"--version"}

	cmd := exec.Command(base, args...)

	if err := cmd.Run(); err != nil {
		return false
	}

	return true
}

func GetTemplateString() string {
	template := viper.GetString("TemplateString")

	if template == "" {
		log.Fatal("No configuration found for [TemplateString]")
	}

	return template
}
