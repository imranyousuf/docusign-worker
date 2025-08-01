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
function createEnvelope(documentName, documentContent, signerEmail, signerName) {
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

  // Create signature tab (positioned at the end of document)
  const signHereTab = new docusign.SignHere();
  signHereTab.documentId = '1';
  signHereTab.pageNumber = '1';
  signHereTab.recipientId = '1';
  signHereTab.tabLabel = 'SignHereTab';
  signHereTab.xPosition = '100';
  signHereTab.yPosition = '700'; // Near bottom of page

  // Create date signed tab
  const dateSignedTab = new docusign.DateSigned();
  dateSignedTab.documentId = '1';
  dateSignedTab.pageNumber = '1';
  dateSignedTab.recipientId = '1';
  dateSignedTab.tabLabel = 'DateSignedTab';
  dateSignedTab.xPosition = '300';
  dateSignedTab.yPosition = '700';

  // Create full name tab
  const fullNameTab = new docusign.FullName();
  fullNameTab.documentId = '1';
  fullNameTab.pageNumber = '1';
  fullNameTab.recipientId = '1';
  fullNameTab.tabLabel = 'FullNameTab';
  fullNameTab.xPosition = '100';
  fullNameTab.yPosition = '650';

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
    const { email, signerName } = req.body;
    
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
        <div class="signature-section" style="margin-top: 50px; padding: 20px; border-top: 1px solid #ccc;">
          <h3>Signature Required</h3>
          <p>Please provide your signature, name, and date below:</p>
          <div style="margin-top: 30px;">
            <div style="margin-bottom: 20px;">
              <label>Full Name: </label>
              <div style="border-bottom: 1px solid #000; width: 200px; display: inline-block;"></div>
            </div>
            <div style="margin-bottom: 20px;">
              <label>Signature: </label>
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

    // Create envelope
    const envelopeDefinition = createEnvelope(
      req.file.originalname || 'document.html',
      enhancedHtml,
      email,
      signerName
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DocuSign API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Main endpoint: POST http://localhost:${PORT}/api/docusign-signature`);
});