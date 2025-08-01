# DocuSign Worker API Reference

Complete API documentation for all envelope management operations.

## 📤 Core Operations

### Send Document for Signature
```
POST /api/docusign-signature
```
**Content-Type:** `multipart/form-data`

**Parameters:**
- `htmlFile` (file): HTML document to be signed
- `email` (string): Recipient's email address
- `signerName` (string): Recipient's full name
- `signaturePageNumber` (string, optional): Page number for signature placement. Use `last` for automatic last page positioning (default), or specific page number like `1`, `2`, etc.
- `signatureXPosition` (string, optional): X coordinate in pixels from left edge. Default: `100`
- `signatureYPosition` (string, optional): Y coordinate in pixels from top edge. Default: `700`

**Signature Layout:**
- Signature field is placed at the specified coordinates
- Full Name field is positioned 50px above the signature
- Date field is positioned 200px to the right of the signature

**Response:**
```json
{
  "success": true,
  "envelopeId": "abc123-def456",
  "status": "sent",
  "recipientEmail": "user@example.com"
}
```

### Health Check
```
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-01T10:00:00Z"
}
```

## 📊 Envelope Status & Monitoring

### Get Envelope Status
```
GET /api/envelope/:envelopeId/status
```

**Response:**
```json
{
  "envelopeId": "abc123-def456",
  "status": "completed",
  "createdDateTime": "2025-01-01T10:00:00Z",
  "lastModifiedDateTime": "2025-01-01T12:00:00Z"
}
```

### Get Workflow Status
```
GET /api/envelope/:envelopeId/workflow
```

**Response:**
```json
{
  "envelopeId": "abc123-def456",
  "workflow": {
    "status": "completed",
    "currentStep": "completed",
    "progressPercentage": 100,
    "totalRecipients": 1,
    "completedRecipients": 1,
    "pendingRecipients": 0,
    "recipients": {
      "signers": [...],
      "carbonCopies": [...]
    }
  }
}
```

## 📄 Document Management

### List Envelope Documents
```
GET /api/envelope/:envelopeId/documents
```

**Response:**
```json
{
  "envelopeId": "abc123-def456",
  "documents": [
    {
      "documentId": "1",
      "name": "contract.html",
      "type": "content"
    }
  ]
}
```

### Download Document
```
GET /api/envelope/:envelopeId/documents/:documentId
```

**Response:** PDF file download

### Download Audit Trail
```
GET /api/envelope/:envelopeId/audit-trail
```

**Response:** PDF file download with complete signing history

## 👥 Recipients Management

### Get Recipients Status
```
GET /api/envelope/:envelopeId/recipients
```

**Response:**
```json
{
  "envelopeId": "abc123-def456",
  "signers": [
    {
      "recipientId": "1",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "completed",
      "signedDateTime": "2025-01-01T12:00:00Z"
    }
  ],
  "carbonCopies": []
}
```

### Add Recipients
```
POST /api/envelope/:envelopeId/recipients
```

**Request Body:**
```json
{
  "signers": [
    {
      "email": "new-signer@example.com",
      "name": "New Signer",
      "routingOrder": "2"
    }
  ],
  "carbonCopies": [
    {
      "email": "cc@example.com",
      "name": "CC Recipient"
    }
  ]
}
```

### Update Recipient
```
PUT /api/envelope/:envelopeId/recipients/:recipientId
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "routingOrder": "1"
}
```

## 🔧 Envelope Control

### Void Envelope
```
POST /api/envelope/:envelopeId/void
```

**Request Body:**
```json
{
  "reason": "Document needs revision"
}
```

### Resend Notification
```
POST /api/envelope/:envelopeId/resend
```

**Response:**
```json
{
  "envelopeId": "abc123-def456",
  "message": "Notification resent successfully"
}
```

## 🏷️ Custom Fields

### Get Custom Fields
```
GET /api/envelope/:envelopeId/custom-fields
```

**Response:**
```json
{
  "envelopeId": "abc123-def456",
  "textCustomFields": [
    {
      "name": "Project Code",
      "value": "PROJ-2025-001"
    }
  ],
  "listCustomFields": []
}
```

### Set Custom Fields
```
POST /api/envelope/:envelopeId/custom-fields
```

**Request Body:**
```json
{
  "textFields": [
    {
      "name": "Project Code",
      "value": "PROJ-2025-001",
      "show": "true",
      "required": "false"
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
}
```

## 🌐 Embedded Signing

### Generate Signing URL
```
POST /api/envelope/:envelopeId/signing-url
```

**Request Body:**
```json
{
  "recipientId": "1",
  "email": "signer@example.com",
  "userName": "John Doe",
  "returnUrl": "https://yourapp.com/success",
  "authenticationMethod": "none"
}
```

**Response:**
```json
{
  "envelopeId": "abc123-def456",
  "recipientId": "1",
  "signingUrl": "https://demo.docusign.net/Signing/...",
  "expiresAt": "2025-01-01T12:05:00Z",
  "message": "Signing URL generated successfully"
}
```

## ⏰ Envelope Settings

### Set Envelope Expiration
```
PUT /api/envelope/:envelopeId/expiration
```

**Request Body:**
```json
{
  "expireEnabled": true,
  "expireAfter": "30",
  "expireWarn": "7"
}
```

### Add Comments
```
POST /api/envelope/:envelopeId/comments
```

**Request Body:**
```json
{
  "text": "Please review section 3 carefully",
  "visibleTo": "everyone"
}
```

## 📊 Bulk Operations

### Bulk Status Check
```
POST /api/envelopes/bulk-status
```

**Request Body:**
```json
{
  "envelopeIds": [
    "abc123-def456",
    "xyz789-ghi012"
  ]
}
```

**Response:**
```json
{
  "envelopes": [
    {
      "envelopeId": "abc123-def456",
      "status": "completed",
      "createdDateTime": "2025-01-01T10:00:00Z",
      "error": null
    },
    {
      "envelopeId": "xyz789-ghi012",
      "status": "sent",
      "createdDateTime": "2025-01-01T11:00:00Z",
      "error": null
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "errors": 0
  }
}
```

## 📋 Status Values

### Envelope Statuses
- `created` - Envelope created but not sent
- `sent` - Sent to recipients
- `delivered` - Email delivered to recipients
- `signed` - At least one recipient has signed
- `completed` - All recipients have signed
- `declined` - A recipient declined to sign
- `voided` - Envelope was cancelled
- `deleted` - Envelope was deleted

### Recipient Statuses
- `created` - Recipient added but envelope not sent
- `sent` - Envelope sent to recipient
- `delivered` - Email delivered to recipient
- `signed` - Recipient has signed
- `completed` - Recipient completed all required actions
- `declined` - Recipient declined to sign
- `autoresponded` - Auto-response received

## 🔒 Authentication

All endpoints require valid DocuSign JWT authentication configured via environment variables:
- `DOCUSIGN_INTEGRATION_KEY`
- `DOCUSIGN_USER_ID`
- `DOCUSIGN_ACCOUNT_ID`
- `DOCUSIGN_PRIVATE_KEY`

## ❌ Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Error description",
  "details": "Detailed error message"
}
```

Common HTTP status codes:
- `400` - Bad Request (missing parameters)
- `401` - Unauthorized (invalid credentials)
- `404` - Not Found (envelope not found)
- `500` - Internal Server Error

## 💡 Usage Examples

### Complete Document Workflow
```bash
# 1. Send document
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@contract.html" \
  -F "email=client@example.com" \
  -F "signerName=Jane Client"

# 2. Monitor progress
curl http://localhost:3000/api/envelope/ENVELOPE_ID/workflow

# 3. Download when complete
curl -O http://localhost:3000/api/envelope/ENVELOPE_ID/documents/1

# 4. Get audit trail
curl -O http://localhost:3000/api/envelope/ENVELOPE_ID/audit-trail
```

### Bulk Monitoring
```bash
curl -X POST http://localhost:3000/api/envelopes/bulk-status \
  -H "Content-Type: application/json" \
  -d '{"envelopeIds": ["env1", "env2", "env3"]}'
```

### Embedded Signing
```bash
curl -X POST http://localhost:3000/api/envelope/ENVELOPE_ID/signing-url \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "1",
    "email": "signer@example.com",
    "userName": "John Doe",
    "returnUrl": "https://myapp.com/signed"
  }'
```