---
title: 'How to integrate container security scan with AWS Elastic Search and Kibana'
excerpt: "The idea of this project is to put together all resources needed to create a Elastic Search cluster with Kibana as visualition tool. 
Which will ingest data reports from Aqua Security kube-bench a Container Security monitor.."
coverImage: '/assets/blog/aws-elastic-search-aqua-security/cover.jpg'
date: '2020-08-05T22:02:28.274Z'
author:
  name: 'Francis Luz'
  picture: '/assets/blog/authors/francis.jpg'
ogImage:
  url: '/assets/blog/aws-elastic-search-aqua-security/cover.jpg'
hero: false
---

## AWS Elastic Search with Cognito (for Kibana), Lambda and Aqua Security (kube-bench) Reports
# Using Cloudformation templates to manange the cloud stack

<a 
  href="https://github.com/francisluz/aws-elasticsearch-cognito-aquasec" 
  target="_blank" 
  class="mx-2 font-bold">
  <img src="https://cdn.jsdelivr.net/npm/simple-icons@3.0.1/icons/github.svg" 
    alt="GitHub Repo" height="22px" width="22px" class="inline mr-2 fill-current"/>
  GitHub Repo
</a>

<img src="https://raw.githubusercontent.com/francisluz/aws-elasticsearch-cognito-aquasec/master/images/AWS-ES-Kibana-Diagram.png" alt="AWS Elastic Search with Cognito and Kibana Diagram">

The idea of this project is to put together all resources needed to create a Elastic Search cluster with Kibana as visualition tool. 

Which will ingest data reports from Aqua Security kube-bench a Container Security monitor.

Table of Contents
=================
- [Prerequisites](#prerequisites)
    - [Execution rights](#execution-rights)
- [AWS Elastic Search](#aws-elastic-search)
    - Components
    - Deployments
    - Cluster for Production
    - Execution
- [Kibana with Cognito](#kibana-with-cognito)
    - Cognito
- [Lambda with S3](#lambda-with-s3)
    - Components
    - Deployments
    - Execution
- [AWS EKS Cluster](#aws-eks-cluster)
- [Integration Test](#integration-test)

## Prerequisites

We will need the basic [**AWS CLI**](https://aws.amazon.com/cli/) setup.

If you don't have a AWS Account here's good guide: [Creating AWS Credetials](https://serverless.com/framework/docs/providers/aws/guide/credentials/).

Basic commands to setup your AWS CLI.

```bash
pip install awscli
aws --version
aws configure
aws iam get-user

# Check Elastic Search versions to see which one suits you best
aws es list-elasticsearch-versions
aws es list-elasticsearch-instance-types --elasticsearch-version 7.1
```

### Execution rights
To be able to run the **`.sh`** deployment files you may need to give them rights.

Example:
```sh
chmod +x ./deploy.sh
```

## AWS Elastic Search

The launch of AWS Elastic Search cluster, involves a set of resources needed in order to acomplish the main goal which is release the cluster with security.

### Components

All the components needed are setup in the cloudformation template **`aws-es-domain.yml`**.
* IAM Roles
* Cognito User Pool
* Congnito Identity Pool
* Elastic Search Domain

### Deployment

Before you run provide your unique values by changing the parameters at **`deploy.sh`**: 
* <GLOBAL_UNIQUE_DOMAIN_NAME>
* <UNIQUE_POOL_NAME>
* <GLOBAL_UNIQUE_POOL_DOMAIN>

### Cluster for Production

If your aim is to deploy the cluster in production or simulate a more powerfull one you need to uncomment the lines in the section **`ElasticsearchDomain`** at:
* aws-es-domain.yml

```yml
ZoneAwarenessEnabled: "true"
DedicatedMasterEnabled: "true"
DedicatedMasterType: "t2.small.elasticsearch"
DedicatedMasterCount: "1"
```

### Execution

The deployment can take from 10 to 15 minutes to finish.

**Run**
```sh
./deploy.sh
```

## Kibana with Cognito

The Kibana setup is verify straight forward now that you have deploy the main Elastic Search script.

Create an user in your User Pool by accessing the AWS Console.

### Cognito
* Manager User Pools
* Your pool
    * **Users and groups** \
    Setup the User name and Password.


## Lambda with S3

The Lambda function is the code that will stream the data to Elastic Search via **S3 Trigger**.

### Components
* AWS S3
* IAM Role
* Lambda Function (Python 3.7)

### Deployment

Fist of all execute the **`deploy-bucket.sh`** to create the bucket base for the lambda.

Update the **lambda function** with the new Elastic Search host name at **`lambda/s3-to-es.py`**.

After the execution of the bucket deployment it will gerenate the **`bucket name`** that you will need to execute the next step.

Now you have to update the parameters with the value from the previous step at **`deploy-lambda.sh`** and also inform the name of your **ingestion bucket**:
* --s3-bucket <YOUR_BUCKET_NAME>
* <INGESTION_BUCKET_NAME>

### Execution

This process will create the **insgestion bucket**,
package, deploy the lambda and create the trigger event between S3 and the function.

**Run**
```sh
./deploy-lambda.sh
```

## AWS EKS Cluster

This step is optional if you already have it setup in your environment, and I also provide a sample file at **`aquasec-log/kube-bench-report.json`** that you can test the ingestion workflow without having to launche a new cluster.

For this section you can follow the steps defined on [**kube-bench**](https://github.com/aquasecurity/kube-bench#running-in-an-eks-cluster) repository.

**Notice**: In the file `job-eks.yml` at the **command** line add the `--json` flag to generate the correct output.

```sh
command: ["kube-bench", "--version", "1.11", "--json"]
```

Based on the main repo guide you can find a sample deployment script here:
* **`deploy-aws-eks.sh`**

## Integration Test

To complete the integration test create a folder **`load`** inside of you **ingestion bucket** and then **upload** the sample file:
* **`aquasec-log/kube-bench-report.json`**

After the upload it should trigger the lambda and create a new index on Elastic Search.

Access your **Kibana** and check your new index there.

## Cloud Cleanup

As we are using Cloudformation which track the changesets, you're able to rollback and delete any resource used. Go to the AWS Console and **Cloud Formation**.


#aws #aws-es #aws-eks #aws-lambda #aws-s3 #shell-script #python

