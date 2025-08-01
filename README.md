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