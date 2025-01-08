import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CdkTask04Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceBucket = new s3.Bucket(this, 'SourceTestBucket08', {
      bucketName: 'sourcetestbucket08',
      versioned: true, 
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
      autoDeleteObjects: true, 
    });

    const destinationBucket = new s3.Bucket(this, 'DestinationTestBucketj08', {
      bucketName: 'destinationtestbucket08',
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const s3LambdaFunction = new lambda.Function(this, 'S3LambdaFunction', {
      runtime: lambda.Runtime.PROVIDED_AL2023, 
      code: lambda.Code.fromAsset('lambda'),
      handler: 'bootstrap', 
      environment: {
        SOURCE_BUCKET: sourceBucket.bucketName,
        DESTINATION_BUCKET: destinationBucket.bucketName,
      },
    });

    sourceBucket.grantRead(s3LambdaFunction);
    destinationBucket.grantReadWrite(s3LambdaFunction);

    sourceBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(s3LambdaFunction)
    );
    
    const eventRule = new events.Rule(this, 'FiveMinuteRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
    });
    
    eventRule.addTarget(new targets.LambdaFunction(s3LambdaFunction));
    
    s3LambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject'],
        resources: [sourceBucket.bucketArn, destinationBucket.bucketArn],
      }),
    );

    new cdk.CfnOutput(this, 'SourceBucketName', { value: sourceBucket.bucketName });
    new cdk.CfnOutput(this, 'DestinationBucketName', { value: destinationBucket.bucketName });

  }
}
