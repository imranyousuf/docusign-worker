# DocuSign Envelope Operations Guide

Once you send a document for signature, DocuSign returns an `envelopeId`. This ID is your key to managing and tracking the entire document lifecycle.

## 🎯 What You Can Do with EnvelopeId

### 1. **Track Envelope Status**
```bash
GET /api/envelope/{envelopeId}/status
```
**Example:**
```bash
curl http://localhost:3000/api/envelope/55f48465-ea5d-41ac-9923-bd29e68a0c0e/status
```
**Response:**
```json
{
  "envelopeId": "55f48465-ea5d-41ac-9923-bd29e68a0c0e",
  "status": "completed",
  "createdDateTime": "2025-01-01T10:00:00Z",
  "lastModifiedDateTime": "2025-01-01T12:30:00Z"
}
```

### 2. **Download Signed Documents**
```bash
GET /api/envelope/{envelopeId}/documents
```
**Lists all documents in the envelope:**
```json
{
  "envelopeId": "55f48465-ea5d-41ac-9923-bd29e68a0c0e",
  "documents": [
    {
      "documentId": "1",
      "name": "document.html",
      "type": "content"
    },
    {
      "documentId": "certificate",
      "name": "Summary",
      "type": "summary"
    }
  ]
}
```

**Download specific document:**
```bash
GET /api/envelope/{envelopeId}/documents/{documentId}
```
```bash
curl -O http://localhost:3000/api/envelope/55f48465-ea5d-41ac-9923-bd29e68a0c0e/documents/1
# Downloads signed PDF
```

### 3. **Check Recipient Status**
```bash
GET /api/envelope/{envelopeId}/recipients
```
**See who has signed, when, and current status:**
```json
{
  "envelopeId": "55f48465-ea5d-41ac-9923-bd29e68a0c0e",
  "signers": [
    {
      "recipientId": "1",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "completed",
      "signedDateTime": "2025-01-01T12:30:00Z",
      "deliveredDateTime": "2025-01-01T10:05:00Z",
      "sentDateTime": "2025-01-01T10:00:00Z"
    }
  ]
}
```

### 4. **Download Audit Trail**
```bash
GET /api/envelope/{envelopeId}/audit-trail
```
**Downloads a PDF with complete signing history:**
```bash
curl -O http://localhost:3000/api/envelope/55f48465-ea5d-41ac-9923-bd29e68a0c0e/audit-trail
# Downloads audit-trail-{envelopeId}.pdf
```

### 5. **Void/Cancel an Envelope**
```bash
POST /api/envelope/{envelopeId}/void
```
**Cancel an envelope before completion:**
```bash
curl -X POST http://localhost:3000/api/envelope/55f48465-ea5d-41ac-9923-bd29e68a0c0e/void \
  -H "Content-Type: application/json" \
  -d '{"reason": "Document needs revision"}'
```

### 6. **Resend Notifications**
```bash
POST /api/envelope/{envelopeId}/resend
```
**Send reminder emails to signers:**
```bash
curl -X POST http://localhost:3000/api/envelope/55f48465-ea5d-41ac-9923-bd29e68a0c0e/resend
```

## 📊 Envelope Status Values

| Status | Description |
|--------|-------------|
| `created` | Envelope created but not sent |
| `sent` | Sent to recipients |
| `delivered` | Email delivered to recipients |
| `signed` | At least one recipient has signed |
| `completed` | All recipients have signed |
| `declined` | A recipient declined to sign |
| `voided` | Envelope was cancelled |
| `deleted` | Envelope was deleted |

## 🔄 Complete Workflow Example

Here's a typical workflow using envelope operations:

### Step 1: Send Document
```bash
curl -X POST http://localhost:3000/api/docusign-signature \
  -F "htmlFile=@contract.html" \
  -F "email=client@example.com" \
  -F "signerName=Jane Client"
```
**Response:**
```json
{
  "success": true,
  "envelopeId": "abc123-def456-ghi789",
  "status": "sent",
  "recipientEmail": "client@example.com"
}
```

### Step 2: Monitor Progress
```bash
# Check status periodically
curl http://localhost:3000/api/envelope/abc123-def456-ghi789/status

# Check recipient details
curl http://localhost:3000/api/envelope/abc123-def456-ghi789/recipients
```

### Step 3: Handle Completion
```bash
# Once status is "completed", download signed document
curl -O http://localhost:3000/api/envelope/abc123-def456-ghi789/documents/1

# Download audit trail for records
curl -O http://localhost:3000/api/envelope/abc123-def456-ghi789/audit-trail
```

### Step 4: Error Handling
```bash
# If needed, void the envelope
curl -X POST http://localhost:3000/api/envelope/abc123-def456-ghi789/void \
  -H "Content-Type: application/json" \
  -d '{"reason": "Client requested changes"}'

# Or resend if no response
curl -X POST http://localhost:3000/api/envelope/abc123-def456-ghi789/resend
```

## 🚀 Integration Patterns

### Webhook Alternative
Instead of polling for status, you can periodically check:
```javascript
async function checkEnvelopeStatus(envelopeId) {
  const response = await fetch(`/api/envelope/${envelopeId}/status`);
  const data = await response.json();
  
  if (data.status === 'completed') {
    // Download documents
    await downloadSignedDocument(envelopeId);
  }
}
```

### Bulk Operations
```javascript
async function processMultipleEnvelopes(envelopeIds) {
  for (const id of envelopeIds) {
    const status = await checkEnvelopeStatus(id);
    console.log(`Envelope ${id}: ${status.status}`);
  }
}
```

### Document Archival
```javascript
async function archiveCompletedEnvelope(envelopeId) {
  // Download signed document
  const docResponse = await fetch(`/api/envelope/${envelopeId}/documents/1`);
  const signedPdf = await docResponse.blob();
  
  // Download audit trail
  const auditResponse = await fetch(`/api/envelope/${envelopeId}/audit-trail`);
  const auditPdf = await auditResponse.blob();
  
  // Store both files in your system
  await storeDocument(envelopeId, signedPdf, auditPdf);
}
```

## 💡 Pro Tips

1. **Always save the envelopeId** - It's your only way to access the envelope later
2. **Check status before operations** - Some operations only work with certain statuses
3. **Download documents when completed** - Don't rely on DocuSign for long-term storage
4. **Keep audit trails** - They provide legal proof of the signing process
5. **Handle errors gracefully** - Network issues can occur, implement retry logic

## 🔐 Security Considerations

- **EnvelopeId is sensitive** - Don't expose it publicly
- **Validate ownership** - Ensure users can only access their envelopes
- **Log operations** - Keep records of who accessed what
- **Secure downloads** - Use temporary URLs or authentication for document access

## 📝 Advanced Operations

With the envelopeId, you can also:
- Add recipients to an existing envelope
- Update recipient information
- Get envelope custom fields
- Retrieve signing URLs for embedded signing
- Get envelope workflow status
- Set envelope expiration
- Add envelope notes and comments

Your DocuSign Worker now provides a complete envelope management API! 🎉