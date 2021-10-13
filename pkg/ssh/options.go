package ssh

import (
	"errors"

	"github.com/spf13/viper"
)

func ValidateOptions() error {
	opts := []bool{
		viper.GetBool("ssm"),
		viper.GetBool("pub"),
		viper.GetBool("priv"),
	}

	if opts[0] {
		return errors.New("SSM not implemented yet")
	}

	count := 0
	for _, opt := range opts {
		if opt {
			count++
		}
	}

	if count > 1 {
		return errors.New("Please specify only one of the following flags: --ssm, --pub, --priv")
	}

	return nil
}
