package utils

import (
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func BindFlags(cmd *cobra.Command, flags []string) {
	for _, flag := range flags {
		viper.BindPFlag(flag, cmd.Flags().Lookup(flag))
	}
}
