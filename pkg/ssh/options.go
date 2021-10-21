package ssh

import (
	"fmt"
	"log"
	"regexp"

	"github.com/JFenstermacher/awssh/pkg/config"
	"github.com/spf13/pflag"
)

func validateBooleanFlags(flags *pflag.FlagSet) {
	ssm, _ := flags.GetBool("ssm")
	pub, _ := flags.GetBool("pub")
	priv, _ := flags.GetBool("priv")

	opts := []bool{ssm, pub, priv}

	if ssm && !config.GetSSMEnabled() {
		log.Fatal("You must enable SSM via the config command")
	}

	count := 0
	for _, opt := range opts {
		if opt {
			count++
		}
	}

	if count > 1 {
		log.Fatal("Please specify only one of the following flags: --ssm, --pub, --priv")
	}
}

func validateOptions(flags *pflag.FlagSet) {
	options, _ := flags.GetStringSlice("option")

	regex := regexp.MustCompile("^[^=]+=[^=]+$")

	for _, opt := range options {
		match := regex.Match([]byte(opt))

		if !match {
			log.Fatal(fmt.Sprintf("Options must be in form {key}={value}: [%s] failed.", opt))
		}
	}
}

func ValidateFlags(flags *pflag.FlagSet) {
	validateBooleanFlags(flags)
	validateOptions(flags)
}
