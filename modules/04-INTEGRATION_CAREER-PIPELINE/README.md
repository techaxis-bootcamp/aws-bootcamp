# BLOCK 4: SECURE INTEGRATION & CAREER PIPELINE

## A) Secure AWS Integration with EC2 & S3

### Start Existing EC2 Server
- Open EC2 Dashboard
- Start previously stopped instance
- Verify server is running

### Connect via SSH

```bash
ssh -i my-key.pem ubuntu@<EC2_PUBLIC_IP>
```

---

### Update Security Group
- Open EC2 Security Group
- Add inbound rule:

| Type | Port | Source |
|---|---|---|
| Custom TCP | `3000` | `0.0.0.0/0` |

---

### Install AWS CLI

```bash
sudo apt update

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

unzip awscliv2.zip

sudo ./aws/install

aws --version
```

---

### Install Bun.js

```bash
curl -fsSL https://bun.sh/install | bash

source ~/.bashrc

bun --version
```

---

## GitHub Lab Repository

### Clone Repository

```bash
git clone https://github.com/techaxis-bootcamp/aws-bootcamp.git

cd modules/04-INTEGRATION_CAREER-PIPELINE/labs/s3-gallery
```

### Install Dependencies

```bash
bun install
```

---

# IAM ACCESS KEYS AUTHENTICATION

## Generate IAM Access Keys
- Open IAM
- Select user
- Security Credentials
- Create Access Key

## Configure AWS CLI

```bash
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Region
- Output format

---

## Start Application

```bash
bun start
```

## Access Application

```txt
http://<EC2_PUBLIC_IP>:3000
```

---

## Verify S3 Access
- Upload file to S3
- Verify bucket access works
- Confirm application connectivity

---

# IAM ROLE-BASED AUTHENTICATION (RECOMMENDED)

## Naming Convention
- EC2 Name:
  `DAV-studentname-ec2`

- IAM Role:
  `DAV-studentname-role`

- IAM Policy:
  `DAV-studentname-policy`

---

## Create IAM Policy
- Open IAM
- Policies
- Create Policy
- Use JSON editor

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3UploadAndReadPermissions",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::BUCKET/*"
        },
        {
            "Sid": "S3ListBucketPermission",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::BUCKET"
        }
    ]
}
```

- Replace:
  `BUCKET`
  with actual bucket name

- Save as:
  `DAV-studentname-policy`

---

## Create IAM Role
- Create role for:
  - EC2

- Attach:
  - `DAV-studentname-policy`

- Attach permission boundary:
  `BootcampBoundary`

- Save role as:
  `DAV-studentname-role`

---

## Attach IAM Role to EC2
- Open EC2
- Select:
  `DAV-studentname-ec2`

- Actions
- Security
- Modify IAM Role

- Attach:
  `DAV-studentname-role`

---

## Verify IAM Role Access

```bash
aws s3 ls

aws s3 cp test.txt s3://BUCKET/
```

---

## Remove Local IAM Credentials

```bash
rm -rf ~/.aws
```

---

## Run Application Again

```bash
bun start
```

---

## Verify
- Application accesses S3 successfully
- Upload functionality works
- No IAM access keys used
- Authentication handled through IAM Role

---

## Key Learning Outcomes
- AWS CLI setup
- Bun.js runtime basics
- Security Group management
- IAM Access Keys vs IAM Roles
- Permission boundaries
- Secure EC2 authentication
- Real-world S3 integration workflow
- Production-style AWS access patterns
````
