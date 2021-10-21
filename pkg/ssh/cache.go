package ssh

import (
	"fmt"
	"log"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/JFenstermacher/awssh/pkg/utils"
	"github.com/spf13/viper"
)

type KeyCache struct {
	cache *viper.Viper
}

type KeyEntry struct {
	Location string
	Hash     string
}

func GetCachePath() string {
	home := viper.GetString("HOME")

	return filepath.Join(home, ".awsshgo", "config.yaml")
}

func NewKeyCache(cachepath string) *KeyCache {
	cache := viper.New()

	dir, file := path.Split(cachepath)
	ext := filepath.Ext(file)

	cache.AddConfigPath(dir)
	cache.SetConfigType(ext)
	cache.SetConfigName(file[:len(file)-len(ext)])

	cache.ReadInConfig()

	return &KeyCache{cache: cache}
}

func (kc *KeyCache) Check(id string) (string, bool) {
	sub := kc.cache.Sub(id)

	if sub == nil {
		return "", false
	}

	var entry KeyEntry

	sub.Unmarshal(&entry)

	hash, err := utils.HashFile(entry.Location)

	if err != nil || hash != entry.Hash {
		return "", false
	}

	return entry.Location, true
}

func expandPath(keypath string) string {
	// Assume this is an absolute path
	if path.IsAbs(keypath) {
		return keypath
	}

	home := viper.GetString("HOME")

	if strings.HasPrefix(keypath, "~") {
		return filepath.Join(home, keypath[1:])
	}

	currdir, _ := os.Getwd()

	path, err := filepath.Abs(filepath.Join(currdir, keypath))

	if err != nil {
		log.Fatal(err)
	}

	return path
}

func (kc *KeyCache) Save(id string, keypath string) {
	hash, err := utils.HashFile(keypath)

	if err != nil {
		log.Fatal(err)
	}

	kc.cache.Set(fmt.Sprintf("%s.%s", id, "Location"), expandPath(keypath))
	kc.cache.Set(fmt.Sprintf("%s.%s", id, "Hash"), hash)

	// TODO: if directory doesn't exist, saving will fail
	kc.cache.WriteConfig()
}
