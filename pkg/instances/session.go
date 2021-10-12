package instances

import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
)

func GetSession(profile string, region string) *session.Session {
	options := session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}

	if profile != "" {
		options.Profile = profile
	}

	if region != "" {
		options.Config = aws.Config{
			Region: aws.String(region),
		}
	}

	return session.Must(session.NewSessionWithOptions(options))
}
