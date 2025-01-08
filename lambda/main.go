package main

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

type Event struct{}

func handleRequest(ctx context.Context, event Event) error {
	sourceBucket := os.Getenv("SOURCE_BUCKET")
	destBucket := os.Getenv("DESTINATION_BUCKET")

	sess := session.Must(session.NewSession())
	svc := s3.New(sess)

	currentTime := time.Now()
	startTime := currentTime.Add(-5 * time.Minute)

	sourceObjects, err := listBucketObjectsWithinTime(svc, sourceBucket, startTime)
	if err != nil {
		return err
	}

	destObjects, err := listBucketObjectsWithinTime(svc, destBucket, startTime)
	if err != nil {
		return err
	}

	log.Printf("Source bucket objects uploaded in the last 5 minutes: %v", sourceObjects)
	log.Printf("Destination bucket objects uploaded in the last 5 minutes: %v", destObjects)

	return nil
}

func listBucketObjectsWithinTime(svc *s3.S3, bucketName string, startTime time.Time) ([]string, error) {
	var objects []string

	err := svc.ListObjectsV2Pages(&s3.ListObjectsV2Input{
		Bucket: aws.String(bucketName),
	}, func(page *s3.ListObjectsV2Output, lastPage bool) bool {
		for _, obj := range page.Contents {
			if obj.LastModified != nil && obj.LastModified.After(startTime) {
				objects = append(objects, *obj.Key)
			}
		}
		return true
	})

	return objects, err
}

func copyObject(svc *s3.S3, sourceBucket, destBucket, key string) error {
	_, err := svc.CopyObject(&s3.CopyObjectInput{
		CopySource: aws.String(strings.Join([]string{sourceBucket, key}, "/")),
		Bucket:     aws.String(destBucket),
		Key:        aws.String(key),
	})
	return err
}

func main() {
	lambda.Start(handleRequest)
}
