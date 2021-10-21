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

	"github.com/JFenstermacher/awssh/pkg/ssh"
	"github.com/spf13/cobra"
)

// cpCmd represents the cp command
var cpCmd = &cobra.Command{
	Use:   "cp",
	Short: "SCP file to instance",
	Run: func(cmd *cobra.Command, args []string) {
		flags := cmd.Flags()

		cachepath := ssh.GetCachePath()
		cache := ssh.NewKeyCache(cachepath.Path)

		instance := ssh.PromptInstance(cmd.Flags())

		key, _ := flags.GetString("identityFile")

		if key == "" {
			key = ssh.PromptKey(instance, cache)
		}

		fmt.Println(instance, key)
	},
}

func init() {
	rootCmd.AddCommand(cpCmd)

	cpCmd.Flags().String("profile", "", "AWS Profile")
	cpCmd.Flags().String("region", "", "AWS Region")
	cpCmd.Flags().StringP("identityFile", "i", "", "identity file required for log into instance")
	cpCmd.Flags().StringP("loginName", "l", "", "username to use while logging into instance")
	cpCmd.Flags().StringSliceP("option", "o", []string{}, "SSH options")

	cpCmd.Flags().IntP("port", "p", 22, "SSH port")

	cpCmd.Flags().BoolP("dryRun", "d", false, "print command without running")
	cpCmd.Flags().Bool("ssm", false, "filters instance and use SSM to connect")
	cpCmd.Flags().Bool("pub", false, "filters instances and use Public IP to connect")
	cpCmd.Flags().Bool("priv", false, "filters instances and use Private IP to connect")
}
