# DocuSign Worker Setup Guide

## 🔧 Quick Fix for Current Error

The error you're seeing is caused by missing DocuSign environment variables. Here's how to fix it:

## Step 1: Create Environment File

Create a `.env` file in your project root with this content:

```env
# DocuSign Configuration - Get these from https://developers.docusign.com/
DOCUSIGN_INTEGRATION_KEY=your_integration_key_here
DOCUSIGN_USER_ID=your_user_id_here
DOCUSIGN_ACCOUNT_ID=your_account_id_here

# RSA Private Key for JWT Authentication (include the full key with headers)
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...your actual private key content...
-----END RSA PRIVATE KEY-----"

# Environment (demo for testing, production for live)
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi

# Server Configuration
PORT=3000
```

## Step 2: Get DocuSign Developer Credentials

### 2.1 Create DocuSign Developer Account
1. Go to https://developers.docusign.com/
2. Sign up for a free developer account
3. Verify your email and complete setup

### 2.2 Create an Application
1. In the DocuSign Admin panel, go to **Apps and Keys**
2. Click **Add App and Integration Key**
3. Fill in your app details:
   - App Name: "My DocuSign Worker"
   - Description: "HTML document signing API"
4. Save and copy your **Integration Key**

### 2.3 Generate RSA Key Pair
1. In your app settings, scroll to **Authentication**
2. Click **Generate RSA**
3. **Download the private key** (keep this secure!)
4. Copy the **public key** and add it to your DocuSign app
5. Click **Save**

### 2.4 Get Your IDs
1. **User ID**: In DocuSign Admin → **My Account** → **User Information** 
2. **Account ID**: In the same section, look for **API Account ID**

## Step 3: Configure Your Application

1. Copy the private key content from the downloaded file
2. Paste it into your `.env` file as `DOCUSIGN_PRIVATE_KEY`
3. Add your Integration Key, User ID, and Account ID

## Step 4: Grant Consent (Required for JWT)

Visit this URL (replace YOUR_INTEGRATION_KEY):
```
https://account-d.docusign.com/oauth/auth?response_type=token&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=https://leads.diybs.app
```

## Step 5: Test Your Configuration

Run the test script:
```bash
node test-docusign.js
```

This will validate your configuration and test the DocuSign connection.

## Step 6: Start Your Server

### Option A: Using Node.js directly
```bash
npm start
```

### Option B: Using Docker (Recommended for Production)

#### Prerequisites
- Docker and Docker Compose installed

#### Quick Start
```bash
# Build and start the service
./docker-scripts.sh build
./docker-scripts.sh start

# Check status
./docker-scripts.sh status

# View logs
./docker-scripts.sh logs

# Test configuration
./docker-scripts.sh test
```

#### Manual Docker Commands
```bash
# Build the image
docker-compose build

# Start the service
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop the service
docker-compose down
```

## 🔍 Troubleshooting

### Error: ENOENT (like you're seeing)
- **Cause**: Private key is missing or formatted incorrectly
- **Fix**: Ensure `DOCUSIGN_PRIVATE_KEY` contains the actual key content, not a file path

### Error: invalid_client
- **Cause**: Wrong Integration Key or User ID
- **Fix**: Double-check your credentials in DocuSign Admin

### Error: consent_required
- **Cause**: Haven't granted application consent
- **Fix**: Visit the consent URL above

### Error: unauthorized_client
- **Cause**: RSA public key not properly configured
- **Fix**: Re-add your public key to your DocuSign application

## 📝 Notes

- Use the **demo environment** for testing
- Keep your private key secure and never commit it to git
- The `.env` file is already in `.gitignore`
- For production, use environment variables instead of `.env` files

## 🚀 Testing Your API

Once configured, test with:
```bash
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@your-document.html" \
  -F "email=test@example.com" \
  -F "signerName=Test Signer"
```

## 🐳 Docker Usage

### Available Docker Commands
```bash
./docker-scripts.sh build     # Build the Docker image
./docker-scripts.sh start     # Start services (detached)
./docker-scripts.sh stop      # Stop services
./docker-scripts.sh restart   # Restart services
./docker-scripts.sh logs      # View logs (follow mode)
./docker-scripts.sh dev       # Development mode
./docker-scripts.sh test      # Test DocuSign config
./docker-scripts.sh status    # Show service status
./docker-scripts.sh clean     # Clean up Docker resources
./docker-scripts.sh help      # Show help
```

### Production Deployment
```bash
# 1. Create environment configuration for Docker
cp docker.env.template .env
# Edit .env with your actual DocuSign credentials

# 2. Build and start
./docker-scripts.sh build
./docker-scripts.sh start

# 3. Verify deployment
./docker-scripts.sh status
curl http://localhost:3000/api/health
```

### Development with Docker
```bash
# Start in development mode (with live logs)
./docker-scripts.sh dev

# Or use compose directly
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```