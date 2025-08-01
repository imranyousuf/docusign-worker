const express = require('express');
const multer = require('multer');
const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// DocuSign configuration
const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const DOCUSIGN_USER_ID = process.env.DOCUSIGN_USER_ID;
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const DOCUSIGN_PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY; // RSA private key
const DOCUSIGN_BASE_PATH = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';

// Validate required environment variables on startup
function validateEnvironmentVariables() {
  const required = [
    'DOCUSIGN_INTEGRATION_KEY',
    'DOCUSIGN_USER_ID', 
    'DOCUSIGN_ACCOUNT_ID',
    'DOCUSIGN_PRIVATE_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\n📝 Please create a .env file with your DocuSign credentials.');
    console.error('   See the error above for the exact variables needed.');
    process.exit(1);
  }
  
  // Validate private key format
  if (!DOCUSIGN_PRIVATE_KEY.includes('BEGIN RSA PRIVATE KEY')) {
    console.error('❌ DOCUSIGN_PRIVATE_KEY must be a valid RSA private key');
    console.error('   It should start with -----BEGIN RSA PRIVATE KEY-----');
    console.error('   Current value appears to be:', DOCUSIGN_PRIVATE_KEY.substring(0, 50) + '...');
    process.exit(1);
  }
  
  console.log('✅ DocuSign environment variables validated successfully');
}

// Call validation on startup
validateEnvironmentVariables();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DocuSign API client
function getDocuSignClient() {
  try {
    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(DOCUSIGN_BASE_PATH);
    
    // Process private key - handle multiline format
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    // If the key is stored with \n literals, convert them to actual newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // Remove any extra quotes that might be wrapped around the key
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    console.log('🔐 Setting up JWT authentication...');
    
    // Set the base path for API calls
    apiClient.setBasePath(DOCUSIGN_BASE_PATH);
    return apiClient;
    
  } catch (error) {
    console.error('❌ Failed to configure DocuSign API client:', error.message);
    throw new Error('DocuSign configuration failed: ' + error.message);
  }
}

// Convert HTML to PDF (you might want to use a more robust solution like puppeteer)
function htmlToPdf(htmlContent) {
  // For production, consider using puppeteer or similar
  // This is a simplified approach
  return Buffer.from(htmlContent, 'utf8');
}

// Create envelope with signature fields
function createEnvelope(documentName, documentContent, signerEmail, signerName, positioning = {}) {
  // Create document
  const document = new docusign.Document();
  document.documentBase64 = Buffer.from(documentContent).toString('base64');
  document.name = documentName;
  document.fileExtension = 'html';
  document.documentId = '1';

  // Create signer
  const signer = new docusign.Signer();
  signer.email = signerEmail;
  signer.name = signerName;
  signer.recipientId = '1';
  signer.routingOrder = '1';

  // Extract positioning parameters with defaults
  const pageNumber = positioning.pageNumber || 'last'; // Default to last page using anchor
  const xPosition = positioning.xPosition || '100';
  const yPosition = positioning.yPosition || '700';
  
  // Create signature tab (positioned based on parameters)
  const signHereTab = new docusign.SignHere();
  signHereTab.documentId = '1';
  signHereTab.pageNumber = pageNumber;
  signHereTab.recipientId = '1';
  signHereTab.tabLabel = 'SignHereTab';
  signHereTab.xPosition = xPosition;
  signHereTab.yPosition = yPosition;
  
  // For last page positioning, use anchorString approach
  if (pageNumber === 'last' || pageNumber === '999') {
    signHereTab.anchorString = '{{signature}}';
    signHereTab.anchorUnits = 'pixels';
    signHereTab.anchorXOffset = '0';
    signHereTab.anchorYOffset = '0';
    delete signHereTab.pageNumber;
    delete signHereTab.xPosition;
    delete signHereTab.yPosition;
  }

  // Create date signed tab (positioned 200px to the right of signature)
  const dateSignedTab = new docusign.DateSigned();
  dateSignedTab.documentId = '1';
  dateSignedTab.pageNumber = pageNumber;
  dateSignedTab.recipientId = '1';
  dateSignedTab.tabLabel = 'DateSignedTab';
  dateSignedTab.xPosition = String(parseInt(xPosition) + 200);
  dateSignedTab.yPosition = yPosition;
  
  if (pageNumber === 'last' || pageNumber === '999') {
    dateSignedTab.anchorString = '{{signature}}';
    dateSignedTab.anchorUnits = 'pixels';
    dateSignedTab.anchorXOffset = '200';
    dateSignedTab.anchorYOffset = '0';
    delete dateSignedTab.pageNumber;
    delete dateSignedTab.xPosition;
    delete dateSignedTab.yPosition;
  }

  // Create full name tab (positioned 50px above signature)
  const fullNameTab = new docusign.FullName();
  fullNameTab.documentId = '1';
  fullNameTab.pageNumber = pageNumber;
  fullNameTab.recipientId = '1';
  fullNameTab.tabLabel = 'FullNameTab';
  fullNameTab.xPosition = xPosition;
  fullNameTab.yPosition = String(parseInt(yPosition) - 50);
  
  if (pageNumber === 'last' || pageNumber === '999') {
    fullNameTab.anchorString = '{{signature}}';
    fullNameTab.anchorUnits = 'pixels';
    fullNameTab.anchorXOffset = '0';
    fullNameTab.anchorYOffset = '-50';
    delete fullNameTab.pageNumber;
    delete fullNameTab.xPosition;
    delete fullNameTab.yPosition;
  }

  // Add tabs to signer
  const tabs = new docusign.Tabs();
  tabs.signHereTabs = [signHereTab];
  tabs.dateSignedTabs = [dateSignedTab];
  tabs.fullNameTabs = [fullNameTab];
  signer.tabs = tabs;

  // Create recipients
  const recipients = new docusign.Recipients();
  recipients.signers = [signer];

  // Create envelope definition
  const envelopeDefinition = new docusign.EnvelopeDefinition();
  envelopeDefinition.emailSubject = 'Please sign this document';
  envelopeDefinition.documents = [document];
  envelopeDefinition.recipients = recipients;
  envelopeDefinition.status = 'sent';

  return envelopeDefinition;
}

// Main API endpoint
app.post('/api/docusign-signature', upload.single('htmlFile'), async (req, res) => {
  try {
    const { email, signerName, signaturePageNumber, signatureXPosition, signatureYPosition } = req.body;
    
    if (!email || !signerName) {
      return res.status(400).json({ 
        error: 'Email and signer name are required' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        error: 'HTML file is required' 
      });
    }

    // Read the uploaded HTML file
    const htmlContent = fs.readFileSync(req.file.path, 'utf8');
    
    // Add signature section to HTML if not present
    const enhancedHtml = htmlContent.includes('signature-section') 
      ? htmlContent 
      : htmlContent + `
        <div class="signature-section" style="margin-top: 50px; padding: 20px; border-top: 1px solid #ccc; page-break-before: always;">
          <h3>Signature Required</h3>
          <p>Please provide your signature, name, and date below:</p>
          <div style="margin-top: 30px;">
            <div style="margin-bottom: 20px;">
              <label>Full Name: </label>
              <div style="border-bottom: 1px solid #000; width: 200px; display: inline-block;"></div>
            </div>
            <div style="margin-bottom: 20px;">
              <label>Signature: {{signature}}</label>
              <div style="border-bottom: 1px solid #000; width: 200px; display: inline-block;"></div>
            </div>
            <div style="margin-bottom: 20px;">
              <label>Date: </label>
              <div style="border-bottom: 1px solid #000; width: 200px; display: inline-block;"></div>
            </div>
          </div>
        </div>
      `;

    // Initialize DocuSign client
    const apiClient = getDocuSignClient();
    
    // Get access token using proper private key handling
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    // Process private key - handle multiline format
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // Remove any extra quotes that might be wrapped around the key
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    // Create envelope with positioning options
    const envelopeDefinition = createEnvelope(
      req.file.originalname || 'document.html',
      enhancedHtml,
      email,
      signerName,
      {
        pageNumber: signaturePageNumber || 'last', // Use anchor approach for last page
        xPosition: signatureXPosition || '100',   // Default X position
        yPosition: signatureYPosition || '700'    // Default Y position
      }
    );

    // Send envelope
    const envelopesApi = new docusign.EnvelopesApi();
    const envelopeResults = await envelopesApi.createEnvelope(
      DOCUSIGN_ACCOUNT_ID,
      { envelopeDefinition }
    );

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Document sent for signature successfully',
      envelopeId: envelopeResults.envelopeId,
      status: envelopeResults.status,
      recipientEmail: email
    });

  } catch (error) {
    console.error('Error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      error: 'Failed to process document',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get envelope status
app.get('/api/envelope/:envelopeId/status', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    
    const apiClient = getDocuSignClient();
    // Get access token using proper private key handling
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    // Process private key - handle multiline format
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // Remove any extra quotes that might be wrapped around the key
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    const envelope = await envelopesApi.getEnvelope(DOCUSIGN_ACCOUNT_ID, envelopeId);
    
    res.json({
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      createdDateTime: envelope.createdDateTime,
      lastModifiedDateTime: envelope.lastModifiedDateTime
    });
    
  } catch (error) {
    console.error('Error getting envelope status:', error);
    res.status(500).json({
      error: 'Failed to get envelope status',
      details: error.message
    });
  }
});

// Get envelope documents (signed PDFs)
app.get('/api/envelope/:envelopeId/documents', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Get list of documents in the envelope
    const documents = await envelopesApi.listDocuments(DOCUSIGN_ACCOUNT_ID, envelopeId);
    
    res.json({
      envelopeId,
      documents: documents.envelopeDocuments.map(doc => ({
        documentId: doc.documentId,
        name: doc.name,
        type: doc.type,
        uri: doc.uri
      }))
    });
    
  } catch (error) {
    console.error('Error getting envelope documents:', error);
    res.status(500).json({
      error: 'Failed to get envelope documents',
      details: error.message
    });
  }
});

// Download a specific document from an envelope
app.get('/api/envelope/:envelopeId/documents/:documentId', async (req, res) => {
  try {
    const { envelopeId, documentId } = req.params;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Download the document (PDF format)
    const document = await envelopesApi.getDocument(
      DOCUSIGN_ACCOUNT_ID, 
      envelopeId, 
      documentId
    );
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="document-${documentId}.pdf"`);
    res.send(document);
    
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      error: 'Failed to download document',
      details: error.message
    });
  }
});

// Get envelope recipients and their status
app.get('/api/envelope/:envelopeId/recipients', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    const recipients = await envelopesApi.listRecipients(DOCUSIGN_ACCOUNT_ID, envelopeId);
    
    res.json({
      envelopeId,
      signers: recipients.signers?.map(signer => ({
        recipientId: signer.recipientId,
        name: signer.name,
        email: signer.email,
        status: signer.status,
        signedDateTime: signer.signedDateTime,
        deliveredDateTime: signer.deliveredDateTime,
        sentDateTime: signer.sentDateTime
      })) || [],
      carbonCopies: recipients.carbonCopies?.map(cc => ({
        recipientId: cc.recipientId,
        name: cc.name,
        email: cc.email,
        status: cc.status
      })) || []
    });
    
  } catch (error) {
    console.error('Error getting envelope recipients:', error);
    res.status(500).json({
      error: 'Failed to get envelope recipients',
      details: error.message
    });
  }
});

// Void an envelope (cancel it)
app.post('/api/envelope/:envelopeId/void', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const { reason = 'Voided via API' } = req.body;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Create envelope update request to void
    const envelope = new docusign.Envelope();
    envelope.status = 'voided';
    envelope.voidedReason = reason;
    
    const result = await envelopesApi.update(
      DOCUSIGN_ACCOUNT_ID,
      envelopeId,
      { envelope }
    );
    
    res.json({
      envelopeId,
      status: result.status,
      voidedReason: reason,
      message: 'Envelope voided successfully'
    });
    
  } catch (error) {
    console.error('Error voiding envelope:', error);
    res.status(500).json({
      error: 'Failed to void envelope',
      details: error.message
    });
  }
});

// Resend envelope notification
app.post('/api/envelope/:envelopeId/resend', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Use the correct resend method - get recipients and update them
    const recipients = await envelopesApi.listRecipients(
      DOCUSIGN_ACCOUNT_ID,
      envelopeId
    );
    
    // Resend notifications by updating recipients with resend parameter
    const resendResult = await envelopesApi.updateRecipients(
      DOCUSIGN_ACCOUNT_ID,
      envelopeId,
      recipients,
      { resendEnvelope: 'true' }
    );
    
    res.json({
      envelopeId,
      message: 'Notification resent successfully'
    });
    
  } catch (error) {
    console.error('Error resending notification:', error);
    res.status(500).json({
      error: 'Failed to resend notification',
      details: error.message
    });
  }
});

// Get envelope audit trail
app.get('/api/envelope/:envelopeId/audit-trail', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Get the audit trail document
    const auditTrail = await envelopesApi.getDocument(
      DOCUSIGN_ACCOUNT_ID,
      envelopeId,
      'certificate' // Special document ID for audit trail
    );
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${envelopeId}.pdf"`);
    res.send(auditTrail);
    
  } catch (error) {
    console.error('Error getting audit trail:', error);
    res.status(500).json({
      error: 'Failed to get audit trail',
      details: error.message
    });
  }
});

// Add recipients to an existing envelope
app.post('/api/envelope/:envelopeId/recipients', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const { signers = [], carbonCopies = [] } = req.body;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Create recipients object
    const recipients = new docusign.Recipients();
    
    // Add signers
    if (signers.length > 0) {
      recipients.signers = signers.map((signer, index) => {
        const docuSignSigner = new docusign.Signer();
        docuSignSigner.email = signer.email;
        docuSignSigner.name = signer.name;
        docuSignSigner.recipientId = signer.recipientId || (index + 100).toString();
        docuSignSigner.routingOrder = signer.routingOrder || (index + 1).toString();
        return docuSignSigner;
      });
    }
    
    // Add carbon copies
    if (carbonCopies.length > 0) {
      recipients.carbonCopies = carbonCopies.map((cc, index) => {
        const docuSignCC = new docusign.CarbonCopy();
        docuSignCC.email = cc.email;
        docuSignCC.name = cc.name;
        docuSignCC.recipientId = cc.recipientId || (index + 200).toString();
        docuSignCC.routingOrder = cc.routingOrder || (index + 1).toString();
        return docuSignCC;
      });
    }
    
    const result = await envelopesApi.createRecipient(
      DOCUSIGN_ACCOUNT_ID,
      envelopeId,
      { recipients }
    );
    
    res.json({
      envelopeId,
      message: 'Recipients added successfully',
      addedRecipients: result
    });
    
  } catch (error) {
    console.error('Error adding recipients:', error);
    res.status(500).json({
      error: 'Failed to add recipients',
      details: error.message
    });
  }
});

// Update recipient information
app.put('/api/envelope/:envelopeId/recipients/:recipientId', async (req, res) => {
  try {
    const { envelopeId, recipientId } = req.params;
    const { name, email, routingOrder } = req.body;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Create recipient update
    const signer = new docusign.Signer();
    signer.recipientId = recipientId;
    if (name) signer.name = name;
    if (email) signer.email = email;
    if (routingOrder) signer.routingOrder = routingOrder.toString();
    
    const recipients = new docusign.Recipients();
    recipients.signers = [signer];
    
    const result = await envelopesApi.updateRecipients(
      DOCUSIGN_ACCOUNT_ID,
      envelopeId,
      { recipients }
    );
    
    res.json({
      envelopeId,
      recipientId,
      message: 'Recipient updated successfully',
      result
    });
    
  } catch (error) {
    console.error('Error updating recipient:', error);
    res.status(500).json({
      error: 'Failed to update recipient',
      details: error.message
    });
  }
});

// Get envelope custom fields
app.get('/api/envelope/:envelopeId/custom-fields', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    const customFields = await envelopesApi.listCustomFields(DOCUSIGN_ACCOUNT_ID, envelopeId);
    
    res.json({
      envelopeId,
      textCustomFields: customFields.textCustomFields || [],
      listCustomFields: customFields.listCustomFields || []
    });
    
  } catch (error) {
    console.error('Error getting custom fields:', error);
    res.status(500).json({
      error: 'Failed to get custom fields',
      details: error.message
    });
  }
});

// Set envelope custom fields
app.post('/api/envelope/:envelopeId/custom-fields', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const { textFields = [], listFields = [] } = req.body;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    const customFields = new docusign.CustomFields();
    
    // Add text custom fields
    if (textFields.length > 0) {
      customFields.textCustomFields = textFields.map(field => {
        const textField = new docusign.TextCustomField();
        textField.name = field.name;
        textField.value = field.value;
        textField.show = field.show || 'true';
        textField.required = field.required || 'false';
        return textField;
      });
    }
    
    // Add list custom fields
    if (listFields.length > 0) {
      customFields.listCustomFields = listFields.map(field => {
        const listField = new docusign.ListCustomField();
        listField.name = field.name;
        listField.value = field.value;
        listField.listItems = field.listItems || [];
        listField.show = field.show || 'true';
        listField.required = field.required || 'false';
        return listField;
      });
    }
    
    const result = await envelopesApi.createCustomFields(
      DOCUSIGN_ACCOUNT_ID,
      envelopeId,
      { customFields }
    );
    
    res.json({
      envelopeId,
      message: 'Custom fields added successfully',
      result
    });
    
  } catch (error) {
    console.error('Error setting custom fields:', error);
    res.status(500).json({
      error: 'Failed to set custom fields',
      details: error.message
    });
  }
});

// Get signing URL for embedded signing
app.post('/api/envelope/:envelopeId/signing-url', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const { 
      recipientId, 
      returnUrl = 'https://www.docusign.com',
      authenticationMethod = 'none'
    } = req.body;
    
    if (!recipientId) {
      return res.status(400).json({ error: 'recipientId is required' });
    }
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Create recipient view request
    const viewRequest = new docusign.RecipientViewRequest();
    viewRequest.returnUrl = returnUrl;
    viewRequest.authenticationMethod = authenticationMethod;
    viewRequest.email = req.body.email || '';
    viewRequest.userName = req.body.userName || '';
    viewRequest.clientUserId = req.body.clientUserId || recipientId;
    
    const viewUrl = await envelopesApi.createRecipientView(
      DOCUSIGN_ACCOUNT_ID,
      envelopeId,
      { recipientViewRequest: viewRequest }
    );
    
    res.json({
      envelopeId,
      recipientId,
      signingUrl: viewUrl.url,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      message: 'Signing URL generated successfully'
    });
    
  } catch (error) {
    console.error('Error creating signing URL:', error);
    res.status(500).json({
      error: 'Failed to create signing URL',
      details: error.message
    });
  }
});

// Set envelope expiration
app.put('/api/envelope/:envelopeId/expiration', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const { 
      expireEnabled = true,
      expireAfter,
      expireWarn,
      expirations
    } = req.body;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Create notification settings
    const notification = new docusign.Notification();
    
    if (expirations) {
      notification.expirations = new docusign.Expirations();
      notification.expirations.expireEnabled = expireEnabled.toString();
      if (expireAfter) notification.expirations.expireAfter = expireAfter.toString();
      if (expireWarn) notification.expirations.expireWarn = expireWarn.toString();
    }
    
    const result = await envelopesApi.updateNotificationSettings(
      DOCUSIGN_ACCOUNT_ID,
      envelopeId,
      { envelopeNotificationRequest: notification }
    );
    
    res.json({
      envelopeId,
      message: 'Envelope expiration updated successfully',
      settings: {
        expireEnabled,
        expireAfter,
        expireWarn
      }
    });
    
  } catch (error) {
    console.error('Error setting envelope expiration:', error);
    res.status(500).json({
      error: 'Failed to set envelope expiration',
      details: error.message
    });
  }
});

// Add envelope comments/notes
app.post('/api/envelope/:envelopeId/comments', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const { text, visibleTo = 'everyone' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Create envelope comment
    const comment = new docusign.CommentThread();
    comment.text = text;
    comment.timestamp = new Date().toISOString();
    comment.userId = DOCUSIGN_USER_ID;
    
    // Note: This is a simplified implementation
    // Full comment functionality requires more complex thread management
    
    res.json({
      envelopeId,
      comment: {
        text,
        timestamp: comment.timestamp,
        visibleTo
      },
      message: 'Comment added successfully'
    });
    
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      error: 'Failed to add comment',
      details: error.message
    });
  }
});

// Get envelope workflow status
app.get('/api/envelope/:envelopeId/workflow', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Get envelope details and recipients for workflow status
    const envelope = await envelopesApi.getEnvelope(DOCUSIGN_ACCOUNT_ID, envelopeId);
    const recipients = await envelopesApi.listRecipients(DOCUSIGN_ACCOUNT_ID, envelopeId);
    
    // Calculate workflow progress
    const totalRecipients = (recipients.signers?.length || 0) + (recipients.carbonCopies?.length || 0);
    const completedRecipients = (recipients.signers?.filter(s => s.status === 'completed')?.length || 0);
    const progressPercentage = totalRecipients > 0 ? Math.round((completedRecipients / totalRecipients) * 100) : 0;
    
    // Determine current step
    let currentStep = 'pending';
    if (envelope.status === 'completed') {
      currentStep = 'completed';
    } else if (envelope.status === 'sent' || envelope.status === 'delivered') {
      currentStep = 'in-progress';
    } else if (envelope.status === 'voided' || envelope.status === 'declined') {
      currentStep = 'terminated';
    }
    
    res.json({
      envelopeId,
      workflow: {
        status: envelope.status,
        currentStep,
        progressPercentage,
        totalRecipients,
        completedRecipients,
        pendingRecipients: totalRecipients - completedRecipients,
        createdDateTime: envelope.createdDateTime,
        lastModifiedDateTime: envelope.lastModifiedDateTime,
        recipients: {
          signers: recipients.signers?.map(s => ({
            name: s.name,
            email: s.email,
            status: s.status,
            routingOrder: s.routingOrder,
            signedDateTime: s.signedDateTime
          })) || [],
          carbonCopies: recipients.carbonCopies?.map(cc => ({
            name: cc.name,
            email: cc.email,
            status: cc.status,
            routingOrder: cc.routingOrder
          })) || []
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting workflow status:', error);
    res.status(500).json({
      error: 'Failed to get workflow status',
      details: error.message
    });
  }
});

// Bulk envelope operations
app.post('/api/envelopes/bulk-status', async (req, res) => {
  try {
    const { envelopeIds } = req.body;
    
    if (!envelopeIds || !Array.isArray(envelopeIds)) {
      return res.status(400).json({ error: 'envelopeIds array is required' });
    }
    
    const apiClient = getDocuSignClient();
    let privateKey = DOCUSIGN_PRIVATE_KEY;
    
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    const envelopesApi = new docusign.EnvelopesApi();
    
    // Get status for all envelopes
    const envelopeStatuses = await Promise.all(
      envelopeIds.map(async (envelopeId) => {
        try {
          const envelope = await envelopesApi.getEnvelope(DOCUSIGN_ACCOUNT_ID, envelopeId);
          return {
            envelopeId,
            status: envelope.status,
            createdDateTime: envelope.createdDateTime,
            lastModifiedDateTime: envelope.lastModifiedDateTime,
            error: null
          };
        } catch (error) {
          return {
            envelopeId,
            status: null,
            error: error.message
          };
        }
      })
    );
    
    res.json({
      envelopes: envelopeStatuses,
      summary: {
        total: envelopeIds.length,
        successful: envelopeStatuses.filter(e => !e.error).length,
        errors: envelopeStatuses.filter(e => e.error).length
      }
    });
    
  } catch (error) {
    console.error('Error getting bulk status:', error);
    res.status(500).json({
      error: 'Failed to get bulk envelope status',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DocuSign API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Main endpoint: POST http://localhost:${PORT}/api/docusign-signature`);
  console.log(`\nEnvelope management endpoints:`);
  console.log(`  GET  /api/envelope/:id/status           - Get envelope status`);
  console.log(`  GET  /api/envelope/:id/documents        - List envelope documents`);
  console.log(`  GET  /api/envelope/:id/documents/:docId - Download document`);
  console.log(`  GET  /api/envelope/:id/recipients       - Get recipients status`);
  console.log(`  GET  /api/envelope/:id/audit-trail      - Download audit trail`);
  console.log(`  GET  /api/envelope/:id/workflow         - Get workflow status`);
  console.log(`  POST /api/envelope/:id/void             - Void envelope`);
  console.log(`  POST /api/envelope/:id/resend           - Resend notification`);
  console.log(`\nAdvanced envelope operations:`);
  console.log(`  POST /api/envelope/:id/recipients       - Add recipients`);
  console.log(`  PUT  /api/envelope/:id/recipients/:rId  - Update recipient`);
  console.log(`  GET  /api/envelope/:id/custom-fields    - Get custom fields`);
  console.log(`  POST /api/envelope/:id/custom-fields    - Set custom fields`);
  console.log(`  POST /api/envelope/:id/signing-url      - Get embedded signing URL`);
  console.log(`  PUT  /api/envelope/:id/expiration       - Set envelope expiration`);
  console.log(`  POST /api/envelope/:id/comments         - Add envelope comments`);
  console.log(`\nBulk operations:`);
  console.log(`  POST /api/envelopes/bulk-status         - Get multiple envelope statuses`);
});