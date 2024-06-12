import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const provider = 'pulumi'


//WEB_BUCKET
const webBucket = new aws.s3.Bucket(`${provider}-workshops`, {
    website: {
        indexDocument: "index.html",
    },
});

const ownershipControls = new aws.s3.BucketOwnershipControls("ownership-controls", {
    bucket: webBucket.id,
    rule: {
        objectOwnership: "ObjectWriter"
    }
});

const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
    bucket: webBucket.id,
    blockPublicAcls: false,
});

const webBucketObject = new aws.s3.BucketObject("index.html", {
    bucket: webBucket.id,
    source: new pulumi.asset.FileAsset("./index.html"),
    contentType: "text/html",
    acl: "public-read",
}, { dependsOn: [publicAccessBlock,ownershipControls] });


export const bucketName = webBucket.id;

export const bucketEndpoint = pulumi.interpolate`http://${webBucket.websiteEndpoint}`;

// IAM User
const s3User = new aws.iam.User("s3User", {
    name: "s3User",
    tags: {
        "workshop": "true",
    },
});

// IAM Policy for S3 access
const s3Policy = new aws.iam.Policy("s3UserPolicy", {
    description: "Policy for S3 access",
    policy: webBucket.arn.apply(bucketArn => JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: [
                    "s3:ListBucket",
                ],
                Resource: [
                    bucketArn,
                ],
            },
            {
                Effect: "Allow",
                Action: [
                    "s3:PutObject",
                    "s3:GetObject",
                    "s3:DeleteObject",
                ],
                Resource: [
                    `${bucketArn}/*`,
                ],
            },
        ],
    })),
});

// Attach Policy to User
const s3UserPolicyAttachment = new aws.iam.UserPolicyAttachment("s3UserPolicyAttachment", {
    user: s3User.name,
    policyArn: s3Policy.arn,
});

// Access keys for the user
const accessKey = new aws.iam.AccessKey("s3UserAccessKey", {
    user: s3User.name,
});

export const accessKeyId = accessKey.id;
export const secretAccessKey = accessKey.secret;


// const vpc = new aws.ec2.Vpc("myVpc", {
//     cidrBlock: "10.0.0.0/16",
//     enableDnsSupport: true, // Enable DNS support
//     enableDnsHostnames: true, // Enable DNS hostnames
//     tags: { Name: "myVpc" },
// });

// // Create public subnets
// const subnet1 = new aws.ec2.Subnet("subnet1", {
//     vpcId: vpc.id,
//     cidrBlock: "10.0.1.0/24",
//     availabilityZone: "eu-west-1a",
//     mapPublicIpOnLaunch: true, // Ensure instances get a public IP
//     tags: { Name: "subnet1" },
// });

// const subnet2 = new aws.ec2.Subnet("subnet2", {
//     vpcId: vpc.id,
//     cidrBlock: "10.0.2.0/24",
//     availabilityZone: "eu-west-1b",
//     mapPublicIpOnLaunch: true, // Ensure instances get a public IP
//     tags: { Name: "subnet2" },
// });

// // Create an Internet Gateway
// const gateway = new aws.ec2.InternetGateway("gateway", {
//     vpcId: vpc.id,
//     tags: { Name: "gateway" },
// });

// // Create a route table and a public route
// const routeTable = new aws.ec2.RouteTable("routeTable", {
//     vpcId: vpc.id,
//     routes: [{
//         cidrBlock: "0.0.0.0/0",
//         gatewayId: gateway.id,
//     }],
//     tags: { Name: "routeTable" },
// });

// // Associate route table with subnets
// new aws.ec2.RouteTableAssociation("subnet1RouteTableAssociation", {
//     subnetId: subnet1.id,
//     routeTableId: routeTable.id,
// });

// new aws.ec2.RouteTableAssociation("subnet2RouteTableAssociation", {
//     subnetId: subnet2.id,
//     routeTableId: routeTable.id,
// });

// // Create RDS Subnet Group
// const dbSubnetGroup = new aws.rds.SubnetGroup("dbsubnetgroup", {
//     subnetIds: [subnet1.id, subnet2.id],
//     tags: {
//         Name: "My DB subnet group",
//     },
// });

// // Create Security Group for RDS
// const dbSecurityGroup = new aws.ec2.SecurityGroup("dbSecurityGroup", {
//     vpcId: vpc.id,
//     description: "Allow database access",
//     ingress: [{
//         protocol: "tcp",
//         fromPort: 5432,
//         toPort: 5432,
//         cidrBlocks: ["0.0.0.0/0"], // Open to all IPs (for workshop purposes)
//     }],
// });

// // Create RDS instance
// const rdsInstance = new aws.rds.Instance("mydbinstance", {
//     allocatedStorage: 20,
//     engine: "postgres",
//     engineVersion: "14",
//     instanceClass: "db.t3.micro",
//     dbName: "workshop",
//     username: "dupa1234567890",
//     password: "super_tajne_haslo",
//     dbSubnetGroupName: dbSubnetGroup.name,
//     vpcSecurityGroupIds: [dbSecurityGroup.id],
//     skipFinalSnapshot: true,
//     publiclyAccessible: true, // Ensure the DB is publicly accessible
// });

// export const dbEndpoint = rdsInstance.endpoint;