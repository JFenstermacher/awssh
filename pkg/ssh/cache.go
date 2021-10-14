package ssh

import (
	"fmt"
	"log"
	"path"
	"path/filepath"

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

func (kc *KeyCache) Save(id string, keypath string) {
	hash, err := utils.HashFile(keypath)

	if err != nil {
		log.Fatal(err)
	}

	kc.cache.Set(fmt.Sprintf("%s.%s", id, "Location"), keypath)
	kc.cache.Set(fmt.Sprintf("%s.%s", id, "Hash"), hash)

	kc.cache.WriteConfig()
}
