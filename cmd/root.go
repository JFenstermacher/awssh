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
	"errors"

	"github.com/JFenstermacher/awssh/pkg/config"
	"github.com/JFenstermacher/awssh/pkg/ssh"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "awssh",
	Short: "SSH into an EC2 instance",
	Long: `Queries instances based on profile and region.
The instances are prompted and rendered based on a configurable template string.
Once an instance is chosen, the private key will either be matched based on prefix or a prompt will appear.
The keys displayed are based on the configurable keys directory.

Assuming a successful login, on logout the instance and key selection will be saved so no future key prompting will occur.
  `,
	Run: func(cmd *cobra.Command, args []string) {
		flags := cmd.Flags()
		ssh.ValidateFlags(flags)

		cachepath := ssh.GetCachePath()
		cache := ssh.NewKeyCache(cachepath.Path)

		instance := ssh.PromptInstance(cmd.Flags())

		key, _ := flags.GetString("identityFile")

		if key == "" {
			key = ssh.PromptKey(instance, cache)
		}

		ssh.SSH(flags, instance, key)

		cache.Save(instance, key)
	},
}

func Execute() {
	cobra.CheckErr(rootCmd.Execute())
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.Flags().String("profile", "", "AWS Profile")
	rootCmd.Flags().String("region", "", "AWS Region")
	rootCmd.Flags().StringP("identityFile", "i", "", "identity file required for log into instance")
	rootCmd.Flags().StringP("loginName", "l", "", "username to use while logging into instance")
	rootCmd.Flags().StringSliceP("option", "o", []string{}, "SSH options")

	rootCmd.Flags().IntP("port", "p", 22, "SSH port")

	rootCmd.Flags().BoolP("dryRun", "d", false, "print command without running")
	rootCmd.Flags().Bool("ssm", false, "filters instance and use SSM to connect")
	rootCmd.Flags().Bool("pub", false, "filters instances and use Public IP to connect")
	rootCmd.Flags().Bool("priv", false, "filters instances and use Private IP to connect")
}

// initConfig reads in config file and ENV variables if set.
func initConfig() {
	cobra.CheckErr(errors.New("Hello"))
	config.LoadConfig()
}
