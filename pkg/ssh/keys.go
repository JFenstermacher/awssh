package ssh

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/AlecAivazis/survey/v2"
	"github.com/JFenstermacher/awssh/pkg/config"
	inst "github.com/JFenstermacher/awssh/pkg/instances"
)

func GetKeys(dir string) []string {
	files := []string{}

	file, err := os.Open(dir)

	if err != nil {
		log.Fatal(err)
	}

	infos, err := file.Readdir(0)

	if err != nil {
		log.Fatal(err)
	}

	for _, info := range infos {
		if !info.IsDir() {
			files = append(files, info.Name())
		}
	}

	if len(files) == 0 {
		log.Fatal(fmt.Sprintf("No keys available in %s", dir))
	}

	return files
}

func SelectKey(instance *inst.Instance, keys []string) string {
	choice := ""

	for _, key := range keys {
		if strings.HasPrefix(key, instance.KeyName) {
			choice = key
			break
		}
	}

	if choice == "" {
		prompt := &survey.Select{
			Message: "Choose instance private key",
			Options: keys,
		}

		if err := survey.AskOne(prompt, &choice); err != nil {
			log.Fatal(err)
		}
	}

	return choice
}

func PromptKey(instance *inst.Instance, cache *KeyCache) string {
	keysDir := config.GetKeysDirectory()

	if keysDir == "" {
		log.Fatal("Keys Directory is not defined. Reinitialize cli.")
	}

	path, found := cache.Check(instance.InstanceId)

	if found {
		return path
	}

	keys := GetKeys(keysDir)
	key := SelectKey(instance, keys)

	return filepath.Join(keysDir, key)
}
