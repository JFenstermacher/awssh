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
		"Configure Base Commad": promptBaseCommand,
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

func promptBaseCommand() {
	prompt := &survey.Input{
		Message: "Configure Base Command",
		Default: GetBaseCommand(),
	}

	value := ""

	if err := survey.AskOne(prompt, &value, survey.WithValidator(survey.Required)); err != nil {
		log.Fatal(err)
	}

	viper.Set("BaseCommand", value)
}
