package utils

import (
	"crypto/md5"
	"encoding/hex"
	"io/ioutil"
)

func HashFile(filename string) (string, error) {
	data, err := ioutil.ReadFile(filename)

	if err != nil {
		return "", err
	}

	hash := md5.New()

	hash.Write(data)

	return hex.EncodeToString(hash.Sum(nil)), nil
}
