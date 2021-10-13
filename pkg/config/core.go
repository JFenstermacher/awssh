package config

type Configuration struct {
	BaseCommand     string
	DefaultUser     string
	KeysDirectory   string
	ConnectionOrder []string
	TemplateString  string
	SSMEnabled      bool
}
