# DocuSign Worker - Dockerized

A Node.js API service for processing HTML documents with DocuSign electronic signatures.

## 🚀 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- DocuSign Developer Account with JWT app configured

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd docusign-worker
```

### 2. Configure Environment
```bash
# Copy the Docker environment template
cp docker.env.template .env

# Edit .env with your DocuSign credentials
nano .env
```

### 3. Build and Run
```bash
# Build the Docker image
./docker-scripts.sh build

# Start the service
./docker-scripts.sh start

# Check status
./docker-scripts.sh status
```

### 4. Test the API
```bash
# Health check
curl http://localhost:3000/api/health

# Test DocuSign configuration
./docker-scripts.sh test

# Send a document for signature
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@your-document.html" \
  -F "email=signer@example.com" \
  -F "signerName=John Doe"
```

## 🔥 Complete cURL Examples

### Core Operations

**Send Document for Signature (Default: Last Page)**
```bash
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@contract.html" \
  -F "email=client@example.com" \
  -F "signerName=Jane Client"
```

**Send Document with Custom Signature Position**
```bash
# Place signature on first page
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@contract.html" \
  -F "email=client@example.com" \
  -F "signerName=Jane Client" \
  -F "signaturePageNumber=1"

# Place signature on specific page with custom coordinates
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@contract.html" \
  -F "email=client@example.com" \
  -F "signerName=Jane Client" \
  -F "signaturePageNumber=2" \
  -F "signatureXPosition=150" \
  -F "signatureYPosition=600"

# Place signature at top of last page
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@contract.html" \
  -F "email=client@example.com" \
  -F "signerName=Jane Client" \
  -F "signatureYPosition=100"
```

**Health Check**
```bash
curl http://localhost:3000/api/health
```

### Envelope Status & Monitoring

**Get Envelope Status**
```bash
curl http://localhost:3000/api/envelope/abc123-def456-ghi789/status
```

**Get Detailed Workflow Status**
```bash
curl http://localhost:3000/api/envelope/abc123-def456-ghi789/workflow
```

### Document Management

**List All Documents in Envelope**
```bash
curl http://localhost:3000/api/envelope/abc123-def456-ghi789/documents
```

**Download Signed Document (PDF)**
```bash
curl -O http://localhost:3000/api/envelope/abc123-def456-ghi789/documents/1
```

**Download Audit Trail**
```bash
curl -O http://localhost:3000/api/envelope/abc123-def456-ghi789/audit-trail
```

### Recipients Management

**Get Recipients Status**
```bash
curl http://localhost:3000/api/envelope/abc123-def456-ghi789/recipients
```

**Add Additional Recipients**
```bash
curl -X POST http://localhost:3000/api/envelope/abc123-def456-ghi789/recipients \
  -H "Content-Type: application/json" \
  -d '{
    "signers": [
      {
        "email": "cfo@company.com",
        "name": "Chief Financial Officer",
        "routingOrder": "2"
      }
    ],
    "carbonCopies": [
      {
        "email": "legal@company.com",
        "name": "Legal Department"
      }
    ]
  }'
```

**Update Recipient Information**
```bash
curl -X PUT http://localhost:3000/api/envelope/abc123-def456-ghi789/recipients/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "updated@example.com",
    "routingOrder": "1"
  }'
```

### Envelope Control

**Void/Cancel Envelope**
```bash
curl -X POST http://localhost:3000/api/envelope/abc123-def456-ghi789/void \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Document needs revision based on client feedback"
  }'
```

**Resend Notification**
```bash
curl -X POST http://localhost:3000/api/envelope/abc123-def456-ghi789/resend
```

### Custom Fields & Metadata

**Get Custom Fields**
```bash
curl http://localhost:3000/api/envelope/abc123-def456-ghi789/custom-fields
```

**Set Custom Fields for Tracking**
```bash
curl -X POST http://localhost:3000/api/envelope/abc123-def456-ghi789/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "textFields": [
      {
        "name": "Project Code",
        "value": "PROJ-2025-001",
        "show": "true",
        "required": "false"
      },
      {
        "name": "Department",
        "value": "Sales",
        "show": "true"
      }
    ],
    "listFields": [
      {
        "name": "Priority",
        "value": "High",
        "listItems": ["High", "Medium", "Low"],
        "show": "true"
      }
    ]
  }'
```

### Embedded Signing

**Generate Embedded Signing URL**
```bash
curl -X POST http://localhost:3000/api/envelope/abc123-def456-ghi789/signing-url \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "1",
    "email": "signer@example.com",
    "userName": "John Doe",
    "returnUrl": "https://myapp.com/signing-complete",
    "authenticationMethod": "none"
  }'
```

### Envelope Settings

**Set Envelope Expiration**
```bash
curl -X PUT http://localhost:3000/api/envelope/abc123-def456-ghi789/expiration \
  -H "Content-Type: application/json" \
  -d '{
    "expireEnabled": true,
    "expireAfter": "30",
    "expireWarn": "7"
  }'
```

**Add Comments/Notes**
```bash
curl -X POST http://localhost:3000/api/envelope/abc123-def456-ghi789/comments \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Please review section 3 carefully before signing",
    "visibleTo": "everyone"
  }'
```

### Bulk Operations

**Check Status of Multiple Envelopes**
```bash
curl -X POST http://localhost:3000/api/envelopes/bulk-status \
  -H "Content-Type: application/json" \
  -d '{
    "envelopeIds": [
      "abc123-def456-ghi789",
      "xyz987-uvw654-rst321",
      "mno456-pqr789-stu012"
    ]
  }'
```

## 📍 Signature Positioning Guide

### Default Behavior (FIXED: Now on Last Page)
By default, signatures are placed on the **last page** of the document using an anchor-based positioning system. A signature section is automatically added to your document with a page break to ensure it appears on the last page.

### Positioning Parameters
| Parameter | Description | Default | Example Values |
|-----------|-------------|---------|----------------|
| `signaturePageNumber` | Page to place signature | `last` (auto last page) | `1`, `2`, `3`, `last` |
| `signatureXPosition` | X coordinate (pixels from left) | `100` | `50`, `150`, `300` |
| `signatureYPosition` | Y coordinate (pixels from top) | `700` | `100`, `400`, `700` |

**How it Works:**
- **Default (`last`)**: Uses anchor positioning with `{{signature}}` text marker and page-break CSS
- **Specific Page Numbers**: Uses exact page coordinates (must exist in document)
- **Automatic Enhancement**: If no signature section exists, one is added with page break

### Layout
- **Signature Field**: At specified position
- **Full Name Field**: 50px above signature
- **Date Field**: 200px to the right of signature

### Common Positioning Scenarios

**Bottom of Last Page (Default)**
```bash
# No parameters needed - this is automatic
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@document.html" \
  -F "email=signer@example.com" \
  -F "signerName=John Doe"
```

**Top of Last Page**
```bash
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@document.html" \
  -F "email=signer@example.com" \
  -F "signerName=John Doe" \
  -F "signatureYPosition=100"
```

**First Page Signature**
```bash
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@document.html" \
  -F "email=signer@example.com" \
  -F "signerName=John Doe" \
  -F "signaturePageNumber=1"
```

**Custom Position on Specific Page**
```bash
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@document.html" \
  -F "email=signer@example.com" \
  -F "signerName=John Doe" \
  -F "signaturePageNumber=3" \
  -F "signatureXPosition=200" \
  -F "signatureYPosition=400"
```

**Center of Page**
```bash
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@document.html" \
  -F "email=signer@example.com" \
  -F "signerName=John Doe" \
  -F "signatureXPosition=300" \
  -F "signatureYPosition=400"
```

## 🎯 Complete Workflow Examples

### Basic Document Workflow
```bash
# 1. Send document for signature
ENVELOPE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@contract.html" \
  -F "email=client@example.com" \
  -F "signerName=Jane Client")

# Extract envelope ID (you might want to use jq for this)
ENVELOPE_ID=$(echo $ENVELOPE_RESPONSE | grep -o '"envelopeId":"[^"]*"' | cut -d'"' -f4)

# 2. Monitor progress
curl http://localhost:3000/api/envelope/$ENVELOPE_ID/status

# 3. Check detailed workflow
curl http://localhost:3000/api/envelope/$ENVELOPE_ID/workflow

# 4. When completed, download signed document
curl -O http://localhost:3000/api/envelope/$ENVELOPE_ID/documents/1

# 5. Download audit trail for compliance
curl -O http://localhost:3000/api/envelope/$ENVELOPE_ID/audit-trail
```

### Multi-Party Signing Workflow
```bash
# 1. Send initial document
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@contract.html" \
  -F "email=manager@company.com" \
  -F "signerName=Department Manager"

# 2. Add additional signers (CEO, CFO)
curl -X POST http://localhost:3000/api/envelope/$ENVELOPE_ID/recipients \
  -H "Content-Type: application/json" \
  -d '{
    "signers": [
      {
        "email": "ceo@company.com",
        "name": "Chief Executive Officer",
        "routingOrder": "2"
      },
      {
        "email": "cfo@company.com", 
        "name": "Chief Financial Officer",
        "routingOrder": "3"
      }
    ]
  }'

# 3. Add legal team to CC
curl -X POST http://localhost:3000/api/envelope/$ENVELOPE_ID/recipients \
  -H "Content-Type: application/json" \
  -d '{
    "carbonCopies": [
      {
        "email": "legal@company.com",
        "name": "Legal Department"
      }
    ]
  }'

# 4. Monitor multi-party progress
curl http://localhost:3000/api/envelope/$ENVELOPE_ID/workflow
```

### Project Tracking Workflow
```bash
# 1. Send document with project metadata
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@statement-of-work.html" \
  -F "email=contractor@company.com" \
  -F "signerName=Contractor Name"

# 2. Add project tracking fields
curl -X POST http://localhost:3000/api/envelope/$ENVELOPE_ID/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "textFields": [
      {
        "name": "Project Code",
        "value": "PROJ-2025-001"
      },
      {
        "name": "Budget Code",
        "value": "BUDGET-IT-2025"
      },
      {
        "name": "Manager",
        "value": "John Smith"
      }
    ]
  }'

# 3. Set expiration (30 days)
curl -X PUT http://localhost:3000/api/envelope/$ENVELOPE_ID/expiration \
  -H "Content-Type: application/json" \
  -d '{
    "expireEnabled": true,
    "expireAfter": "30",
    "expireWarn": "7"
  }'

# 4. Add project notes
curl -X POST http://localhost:3000/api/envelope/$ENVELOPE_ID/comments \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Q1 2025 SOW - Budget approved by finance team"
  }'
```

### Embedded Signing Integration
```bash
# 1. Send document (without email notification)
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@agreement.html" \
  -F "email=user@myapp.com" \
  -F "signerName=App User"

# 2. Generate embedded signing URL
SIGNING_RESPONSE=$(curl -s -X POST http://localhost:3000/api/envelope/$ENVELOPE_ID/signing-url \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "1",
    "email": "user@myapp.com",
    "userName": "App User",
    "returnUrl": "https://myapp.com/documents/signed",
    "authenticationMethod": "none"
  }')

# Extract signing URL and redirect user in your app
echo $SIGNING_RESPONSE | grep -o '"signingUrl":"[^"]*"'
```

### Bulk Monitoring Dashboard
```bash
# Get status of all pending envelopes
curl -X POST http://localhost:3000/api/envelopes/bulk-status \
  -H "Content-Type: application/json" \
  -d '{
    "envelopeIds": [
      "env1-abc123",
      "env2-def456", 
      "env3-ghi789",
      "env4-jkl012",
      "env5-mno345"
    ]
  }' | jq '.'
```

## 🐳 Docker Commands

| Command | Description |
|---------|-------------|
| `./docker-scripts.sh build` | Build the Docker image |
| `./docker-scripts.sh start` | Start services (detached mode) |
| `./docker-scripts.sh stop` | Stop services |
| `./docker-scripts.sh restart` | Restart services |
| `./docker-scripts.sh logs` | View logs (follow mode) |
| `./docker-scripts.sh dev` | Development mode with logs |
| `./docker-scripts.sh test` | Test DocuSign configuration |
| `./docker-scripts.sh status` | Show service status and health |
| `./docker-scripts.sh clean` | Clean up Docker resources |

## 📁 Project Structure
```
docusign-worker/
├── Dockerfile              # Main Docker image definition
├── docker-compose.yml      # Production Docker Compose
├── docker-compose.dev.yml  # Development overrides
├── .dockerignore           # Docker build exclusions
├── docker-scripts.sh       # Helper scripts for Docker operations
├── docker.env.template     # Environment configuration template
├── server.js               # Main application
├── test-docusign.js        # Configuration test script
├── package.json            # Node.js dependencies
├── uploads/                # File upload directory
├── SETUP.md                # Detailed setup instructions
└── grant-consent-guide.md  # DocuSign consent troubleshooting
```

## 🔧 Environment Variables

Required variables in your `.env` file:

```env
# Node.js Configuration
NODE_ENV=production
PORT=3000

# DocuSign Credentials (Required)
DOCUSIGN_INTEGRATION_KEY=your_integration_key
DOCUSIGN_USER_ID=your_user_id
DOCUSIGN_ACCOUNT_ID=your_account_id
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# DocuSign Environment
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
```

## 🏥 Health Monitoring

The container includes built-in health checks:
- Health endpoint: `GET /api/health`
- Docker health check runs every 30 seconds
- Automatic restart on health check failure

## 🔒 Security Features

- ✅ Non-root user execution
- ✅ Minimal Alpine Linux base image
- ✅ Environment variable security
- ✅ .dockerignore for build optimization
- ✅ Private key handling in environment variables
- ✅ Separated development and production configs

## 📚 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/docusign-signature` | Send HTML document for signature |
| `GET` | `/api/envelope/:id/status` | Check envelope signature status |
| `GET` | `/api/health` | Health check endpoint |

## 🚨 Troubleshooting

### Container Won't Start
```bash
# Check logs
./docker-scripts.sh logs

# Verify environment
./docker-scripts.sh test
```

### DocuSign Configuration Issues
```bash
# Test configuration
./docker-scripts.sh test

# Check environment variables
docker-compose exec docusign-worker env | grep DOCUSIGN
```

### Permission Issues
```bash
# Ensure uploads directory exists
mkdir -p uploads
chmod 755 uploads
```

## 📖 Documentation

- [Complete Setup Guide](SETUP.md) - Detailed setup instructions
- [DocuSign Consent Guide](grant-consent-guide.md) - JWT consent troubleshooting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker: `./docker-scripts.sh dev`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details