# S3 Image Gallery & Uploader (Bun.js Lab)

A simple, modern, high-performance web application designed to demonstrate AWS S3 file upload, listing, and deletion operations using the native Bun.js HTTP server and the official AWS SDK v3.

Presented as part of the **DAV College × TechAxis AWS Cloud Bootcamp**.

## Features

- **Drag & Drop Upload**: A sleek drag-and-drop file upload zone with interactive visual feedback and upload progress indicators.
- **S3 Media Vault**: A responsive CSS grid gallery showing all images uploaded to S3.
- **Interactive Lightbox**: View images in full resolution directly inside the application, complete with options to download or delete.
- **Bun Serving & AWS SDK Integration**: Built with `Bun.serve` for near-zero latency, communicating with S3 via `@aws-sdk/client-s3`.

## Prerequisites

- **Bun** installed (v1.x.x). If not installed, install it using:
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- **AWS Credentials** configured locally.
  This app relies on AWS credentials matching your student IAM User. It will check:
  - Standard environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
  - An AWS CLI profile defined in your `.env` file (e.g., `AWS_PROFILE=bootcamp`).

## Getting Started

1. **Navigate to the Lab directory**:
   ```bash
   cd labs/s3-gallery-bun
   ```

2. **Install Dependencies**:
   ```bash
   bun install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and verify the settings:
   ```ini
   PORT=3000
   AWS_REGION=ap-south-1
   AWS_BUCKET_NAME=techaxis-873938828855-ap-south-1-an
   AWS_PROFILE=bootcamp
   ```

4. **Run the Development Server**:
   ```bash
   bun run dev
   ```
   This will start the server with hot-reloading enabled.

5. **Access the App**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## S3 Permissions Required

The application requires an IAM User policy with the following permissions for the target S3 bucket:

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
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        },
        {
            "Sid": "S3ListBucketPermission",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
        }
    ]
}
```

Ensure your bucket has public access or a bucket policy allowing public read access (`s3:GetObject`) if you wish for the image URLs to load in the frontend.

---

## ⚡ Classroom Demos: Deploying to EC2 & IAM Authentication

This lab is optimized to demonstrate the differences between **AWS Access Keys** (long-lived secrets) and **IAM Roles** (temporary credentials) when deploying apps to production EC2 instances.

### 🏠 Demo 1: Deploy with AWS Access Keys (Standard Method)

In this demo, students manually generate access keys and supply them to the application.

1. **Generate Keys**: In the AWS IAM Console, go to your user -> **Security Credentials** -> **Create Access Key**. Copy the ID and Secret Key.
2. **Configure `.env`**: Create/edit `.env` on the EC2 instance:
   ```ini
   PORT=3000
   AWS_REGION=ap-south-1
   AWS_BUCKET_NAME=techaxis-873938828855-ap-south-1-an
   
   # Provide access keys directly:
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   ```
3. **Start the Server**:
   ```bash
   bun run dev
   ```
4. **Inspect Console Logs**: The server will output:
   ```text
   ⚙️  Configuring S3 Client...
      Bucket: techaxis-873938828855-ap-south-1-an
      Region: ap-south-1
      🔑 Auth Method: AWS Access Keys (from .env / environment)
   ```
5. **Critique**: Point out to students that storing keys in plain-text `.env` files is a security risk. If a developer accidentally pushes `.env` to GitHub or if the server is compromised, the keys are leaked.

---

### 🛡️ Demo 2: Deploy with IAM Instance Roles (Secure Best Practice)

In this demo, the EC2 instance retrieves credentials securely without any keys saved on disk.

1. **Create an IAM Role**:
   - Go to **IAM Console** -> **Roles** -> **Create Role**.
   - Select **AWS Service** -> **EC2**.
   - Attach the S3 Policy (e.g. your policy that allows `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` on the target bucket).
   - Name the role (e.g., `EC2-S3-Gallery-Role`).
2. **Attach the Role to EC2**:
   - Go to the **EC2 Console**, select your instance.
   - Click **Actions** -> **Security** -> **Modify IAM Role**.
   - Choose `EC2-S3-Gallery-Role` and save.
3. **Configure `.env` (No Keys)**:
   Clear all credentials from the `.env` file on the EC2 instance:
   ```ini
   PORT=3000
   AWS_REGION=ap-south-1
   AWS_BUCKET_NAME=techaxis-873938828855-ap-south-1-an
   
   # Do NOT define AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or AWS_PROFILE here.
   ```
4. **Start the Server**:
   ```bash
   bun run dev
   ```
5. **Inspect Console Logs**: The server will output:
   ```text
   ⚙️  Configuring S3 Client...
      Bucket: techaxis-873938828855-ap-south-1-an
      Region: ap-south-1
      🛡️  Auth Method: Default Provider Chain (IAM Role on EC2 / Instance Profile)
   ```
   *The AWS SDK automatically requests temporary credentials from the EC2 Instance Metadata Service (IMDS) at IP `169.254.169.254` under the hood!*
6. **Key Takeaway**: There are no access keys stored on the server's filesystem, making this the most secure way to run cloud applications.

