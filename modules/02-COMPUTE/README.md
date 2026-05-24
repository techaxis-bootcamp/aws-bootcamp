# BLOCK 2: COMPUTE PROVISIONING & SSH

### Access AWS Console
- Login using IAM user
- Open EC2 Dashboard

### Create Key Pair
- Create new key pair
- Download `.pem` file
- Store securely

### Create Security Group
- Create security group:
  `DAV-studentname-SSH-SG`
- Allow inbound SSH access:
  - Type: SSH
  - Port: `22`
  - Source: `0.0.0.0/0`

### Launch EC2 Instance
- Select Ubuntu Server 26.04 AMI
- Choose instance type
- Attach:
  - Key pair
  - Security group
- Launch instance

### Connect via SSH

```bash
chmod 400 my-key.pem

ssh -i my-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### Install Node.js

```bash
sudo apt update

curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -

sudo apt install -y nodejs

node -v
npm -v
```

### OR Install Bun.js

```bash
curl -fsSL https://bun.sh/install | bash

source ~/.bashrc

bun --version
```

### Basic Server Management

```bash
pwd
ls
cd
mkdir test-app
touch app.js
cat /etc/os-release
free -h
df -h
top
```

### Cleanup
- Stop EC2 instance
- Terminate EC2 instance
- Verify instance termination