/*
Copyright © 2021 NAME HERE <EMAIL ADDRESS>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/spf13/viper"

	"github.com/JFenstermacher/awssh/pkg/config"
	"github.com/JFenstermacher/awssh/pkg/utils"
)

var rootCmd = &cobra.Command{
	Use:   "awssh",
	Short: "SSH into EC2",
	Long:  `Prompts for EC2 instance, and key if not cached. Then, SSH into an instance.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Called root")
	},
}

func Execute() {
	cobra.CheckErr(rootCmd.Execute())
}

func init() {
	cobra.OnInitialize(initConfig)

	// Local Command Flag
	rootCmd.Flags().String("profile", "", "AWS Profile")
	rootCmd.Flags().String("region", "", "AWS Region")
	rootCmd.Flags().StringP("identityFile", "i", "", "Identity file required for log into instance")
	rootCmd.Flags().StringP("loginName", "l", "", "Username to use while logging into instance")
	rootCmd.Flags().StringSliceP("option", "o", []string{}, "SSH options")

	rootCmd.Flags().IntP("port", "p", 22, "SSH port")

	rootCmd.Flags().BoolP("dryRun", "d", false, "Print command without running")
	rootCmd.Flags().Bool("ssm", false, "Filters instance and use SSM to connect")
	rootCmd.Flags().Bool("pub", false, "Filters instances and use Public IP to connect")
	rootCmd.Flags().Bool("priv", false, "Filters instances and use Private IP to connect")

	utils.BindFlags(rootCmd, []string{
		"profile",
		"region",
		"dryRun",
		"identityFile",
		"loginName",
		"option",
		"port",
		"ssm",
		"pub",
		"priv",
	})
}

// initConfig reads in config file and ENV variables if set.
func initConfig() {
	// Find home directory.
	home, err := os.UserHomeDir()
	cobra.CheckErr(err)

	config.Load(home)
}
