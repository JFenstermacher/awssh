package config

import (
	"errors"
	"log"

	"text/template"

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

func Prompt() {
	choices := map[string]func(){
		"Base Command Flags": promptBaseFlags,
		"Default EC2 User":   promptDefaultUser,
		"SSH Keys Directory": promptKeysDirectory,
		"Connection Order":   promptConnectionOrder,
		"Template String":    promptTemplate,
		"Reset Defaults":     resetDefaults,
	}

	if IsSSMPossible() {
		choices["Toggle SSM Proxying"] = promptSSM
	}

	options := getPromptKeys(choices)

	prompt := &survey.Select{
		Message: "Choose an item to configure",
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

		prompt.Options = conns
	}

	res = append(res, conns...)

	viper.Set("ConnectionOrder", res)
}

func promptSSM() {
	enabled := GetSSMEnabled()

	message := "Enable Connecting via SSM"

	if enabled {
		message = "Disable Connecting via SSM"
	}

	prompt := &survey.Confirm{
		Message: message,
	}

	value := false

	if err := survey.AskOne(prompt, &value); err != nil {
		log.Fatal(err)
	}

	if !value {
		return
	}

	conns := GetConnectionOrder()

	if enabled {
		newConns := []string{}

		for _, conn := range conns {
			if conn != "SSM" {
				newConns = append(newConns, conn)
			}
		}

		conns = newConns
	} else {
		if len(conns) == 2 {
			conns = append(conns, "SSM")
		}
	}

	viper.Set("SSMEnabled", value)
	viper.Set("ConnectionOrder", conns)
}

func promptTemplate() {
	prompt := &survey.Input{
		Message: "Provide Instance Rendering Template",
		Default: GetTemplateString(),
	}

	templateString := ""

	validator := func(value interface{}) error {
		str, ok := value.(string)

		if !ok {
			return errors.New("Not valid string")
		}

		_, err := template.New("instance").Parse(str)

		if err != nil {
			return errors.New("Template string provided can't be rendered")
		}

		return nil
	}

	if err := survey.AskOne(prompt, &templateString, survey.WithValidator(validator)); err != nil {
		log.Fatal(err)
	}

	viper.Set("TemplateString", templateString)
}

func resetDefaults() {
	prompt := &survey.Confirm{
		Message: "Are you sure you'd like to reset to defaults?",
	}

	value := false

	if err := survey.AskOne(prompt, &value); err != nil {
		log.Fatal(err)
	}

	if value {
		SetDefaults(true)
	}
}
