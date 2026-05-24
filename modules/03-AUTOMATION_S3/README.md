# BLOCK 3: AUTOMATION & S3

## A) EC2 Automation with User Data

### Create Web Security Group
- Create security group:
  `DAV-studentname-WEB-SSH-SG`

### Configure Inbound Rules
- Allow SSH
  - Port: `22`
  - Source: `0.0.0.0/0`

- Allow HTTP
  - Port: `80`
  - Source: `0.0.0.0/0`

### Create EC2 Instance with User Data
- Open EC2 Dashboard
- Launch Ubuntu 26.04 EC2
- Attach:
  - Existing key pair
  - `DAV-studentname-WEB-SSH-SG`
- Add User Data script

```bash
#!/bin/bash

# Update system packages
sudo apt-get update -y

# Install Nginx
sudo apt-get install -y nginx

# Start & Enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Remove default page
sudo rm -f /var/www/html/index.nginx-debian.html

# Create custom landing page
echo "<html><body style='font-family:sans-serif;text-align:center;padding-top:100px;background:#fdfbf7;'><h1 style='color:#ea580c;'>DAV AWS Bootcamp Live on Ubuntu! 🚀</h1><p style='font-size:1.2rem;color:#1e293b;'>Powered by Nginx &middot; Led by Instructor Niran Maharjan</p></body></html>" > /var/www/html/index.html
```

### Verify Deployment
- Copy EC2 public IP
- Open in browser
- Verify custom Nginx page

### Basic Automation Understanding
- What is `user_data`
- EC2 boot-time automation
- Infrastructure automation basics

### Cleanup
- Stop EC2 instance
- Do NOT terminate instance

---

## B) AWS S3 Static Website Hosting

### Create S3 Bucket
- Open S3 Dashboard
- Create globally unique bucket
- Disable Block Public Access

## GitHub Lab Repository

### Clone Repository

```bash
git clone https://github.com/techaxis-bootcamp/aws-bootcamp.git

cd modules/03-AUTOMATION_S3/labs/
```

### Upload Static Website Files
- Upload:
  - `labs/index.html`

### Enable Static Website Hosting
- Open:
  - Properties
  - Static website hosting
- Enable hosting
- Set:
  - Index document: `index.html`

### Configure Bucket Permissions
- Add bucket policy for public access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

### Verify Website
- Open S3 website endpoint
- Verify static website loads successfully
