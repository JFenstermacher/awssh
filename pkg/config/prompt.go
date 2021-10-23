package config

import (
	"log"

	"github.com/AlecAivazis/survey/v2"
	"github.com/spf13/viper"
)

func getPromptKeys(m map[string]func()) []string {
	keys := []string{}

	for key := range m {
		keys = append(keys, key)
	}

	return keys
}

func PromptChoice() {
	choices := map[string]func(){
		"Configure Base Command Flags": promptBaseFlags,
		"Configure Default EC2 User":   promptDefaultUser,
		"Configure SSH Keys Directory": promptKeysDirectory,
		"Configure Connection Order":   promptConnectionOrder,
		"Configure SSM Proxying":       promptSSM,
	}

	options := getPromptKeys(choices)

	prompt := &survey.Select{
		Message: "Choose an item to cofigure",
		Options: options,
	}

	for {
		choice := ""

		if err := survey.AskOne(prompt, &choice); err != nil {
			log.Fatal(err)
		}

		choices[choice]()

		WriteConfig()
	}
}

func promptBaseFlags() {
	prompt := &survey.Input{
		Message: "Specify Base Command Flags",
		Default: GetBaseFlags(),
		Help:    "Flags specified here will be appended by to ssh and scp commands. Example: ssh {baseflags} {rest...}",
	}

	value := ""

	if err := survey.AskOne(prompt, &value); err != nil {
		log.Fatal(err)
	}

	viper.Set("BaseFlags", value)
}

func promptDefaultUser() {
	prompt := &survey.Input{
		Message: "Specify Default EC2 User",
		Default: GetDefaultUser(),
		Help:    "Default user that will used to log into instance",
	}

	value := ""

	if err := survey.AskOne(prompt, &value, survey.WithValidator(survey.Required)); err != nil {
		log.Fatal(err)
	}

	viper.Set("DefaultUser", value)
}

func promptKeysDirectory() {
	prompt := &survey.Input{
		Message: "Specify SSH Keys Directory",
		Default: GetKeysDirectory(),
		Help:    "The directory where SSH keys are held",
	}

	value := ""

	if err := survey.AskOne(prompt, &value); err != nil {
		log.Fatal(err)
	}

	viper.Set("KeysDirectory", value)
}

func filterConns(conns []string, remove string) []string {
	filtered := []string{}

	for _, conn := range conns {
		if conn != remove {
			filtered = append(filtered, conn)
		}
	}

	return filtered
}

func promptConnectionOrder() {
	conns := GetConnectionOrder()
	prompt := &survey.Select{
		Message: "Specify connection order",
		Options: conns,
		Help:    "Instances can be connected by either public ip, private ip or instance-id (SSM proxying).\nSpecify the order in which those options will be selected.",
	}

	res := []string{}
	for len(conns) > 1 {
		value := ""

		if err := survey.AskOne(prompt, &value); err != nil {
			log.Fatal(err)
		}

		res = append(res, value)
		conns = filterConns(conns, value)
	}

	res = append(res, conns...)

	viper.Set("ConnectionOrder", res)
}

func promptSSM() {
	prompt := &survey.Confirm{
		Message: "Enable Connecting via SSM",
	}

	value := false

	if err := survey.AskOne(prompt, &value); err != nil {
		log.Fatal(err)
	}

	conns := GetConnectionOrder()
	if value {
		if len(conns) == 2 {
			conns = append(conns, "SSM")
		}
	} else {
		newConns := []string{}

		for _, conn := range conns {
			if conn != "SSM" {
				newConns = append(newConns, conn)
			}
		}

		conns = newConns
	}

	viper.Set("SSMEnabled", value)
	viper.Set("ConnectionOrder", conns)
}

func promptTemplate() {

}
