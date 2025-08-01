#!/usr/bin/env node

const docusign = require('docusign-esign');
require('dotenv').config();

// Test DocuSign configuration
async function testDocuSignConfig() {
  console.log('🔍 Testing DocuSign Configuration...\n');
  
  // Check environment variables
  const requiredVars = [
    'DOCUSIGN_INTEGRATION_KEY',
    'DOCUSIGN_USER_ID',
    'DOCUSIGN_ACCOUNT_ID', 
    'DOCUSIGN_PRIVATE_KEY'
  ];
  
  console.log('📋 Checking environment variables:');
  const missing = [];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ ${varName}: NOT SET`);
      missing.push(varName);
    } else if (varName === 'DOCUSIGN_PRIVATE_KEY') {
      const isValidKey = value.includes('BEGIN RSA PRIVATE KEY');
      console.log(`${isValidKey ? '✅' : '❌'} ${varName}: ${isValidKey ? 'Valid format' : 'Invalid format'}`);
      if (!isValidKey) missing.push(varName);
    } else {
      const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
      console.log(`✅ ${varName}: ${preview}`);
    }
  });
  
  if (missing.length > 0) {
    console.log('\n❌ Configuration incomplete. Missing or invalid variables:', missing.join(', '));
    console.log('\n📝 Please check your .env file and ensure all variables are set correctly.');
    return false;
  }
  
  console.log('\n✅ All environment variables are set correctly\n');
  
  // Test DocuSign API connection
  try {
    console.log('🔐 Testing DocuSign API connection...');
    
    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi');
    
    // Process private key
    let privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    console.log('🎯 Requesting JWT token...');
    
    // Request token directly (no need for deprecated configureJWTAuthorizationFlow)
    const results = await apiClient.requestJWTUserToken(
      process.env.DOCUSIGN_INTEGRATION_KEY,
      process.env.DOCUSIGN_USER_ID,
      'signature',
      privateKey,
      3600
    );
    
    if (results && results.body && results.body.access_token) {
      console.log('✅ JWT token obtained successfully!');
      console.log(`📊 Token expires in: ${results.body.expires_in} seconds`);
      
      // Test account access
      apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
      docusign.Configuration.default.setDefaultApiClient(apiClient);
      
      // Get user info using the correct method
      try {
        const userInfo = await apiClient.getUserInfo(results.body.access_token);
        
        console.log('🏢 Account information:');
        if (userInfo.accounts && userInfo.accounts.length > 0) {
          userInfo.accounts.forEach((account, index) => {
            console.log(`   Account ${index + 1}: ${account.accountName} (${account.accountId})`);
            console.log(`   Base URI: ${account.baseUri}`);
          });
        }
        
      } catch (userInfoError) {
        // If getUserInfo fails, that's okay - we still have a valid token
        console.log('⚠️  Could not retrieve user info, but JWT token is valid');
        console.log('   This is normal and your application will still work');
      }
      
      console.log('\n🎉 DocuSign configuration test completed successfully!');
      console.log('✅ Your application should now work correctly.');
      return true;
      
    } else {
      console.log('❌ Failed to obtain JWT token - invalid response');
      return false;
    }
    
  } catch (error) {
    console.log('\n❌ DocuSign API test failed:');
    console.log('Error:', error.message);
    
    // Try to get more details from the error response
    if (error.response && error.response.data) {
      console.log('Detailed error:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.message.includes('ENOENT')) {
      console.log('\n💡 This error suggests the private key is being treated as a file path.');
      console.log('   Make sure your private key in .env contains the actual key content, not a file path.');
    } else if (error.response?.data?.error === 'consent_required') {
      console.log('\n🔐 User consent is required for JWT authentication');
      console.log('\n📋 Try these methods to grant consent:');
      console.log('\n🏢 Method 1 - DocuSign Admin (Recommended):');
      console.log('   1. Go to: https://admindemo.docusign.com');
      console.log('   2. Navigate to: Apps and Keys');
      console.log('   3. Find your app with Integration Key:', process.env.DOCUSIGN_INTEGRATION_KEY);
      console.log('   4. Click "Actions" → "Grant Admin Consent"');
      console.log('\n🌐 Method 2 - Consent URL (Correct Format):');
      console.log(`   https://account-d.docusign.com/oauth/auth?response_type=token&scope=signature%20impersonation&client_id=${process.env.DOCUSIGN_INTEGRATION_KEY}&redirect_uri=https://leads.diybs.app`);
      console.log('\n🌐 Method 3 - Alternative URL:');
      console.log(`   https://account-d.docusign.com/oauth/auth?response_type=token&scope=signature&client_id=${process.env.DOCUSIGN_INTEGRATION_KEY}&redirect_uri=https://www.google.com`);
      console.log('\n✅ After granting consent, run this test again: node test-docusign.js');
    } else if (error.message.includes('status code 400')) {
      console.log('\n💡 HTTP 400 Bad Request - Check credentials or consent:');
      console.log('   - If you see consent_required above, follow the consent instructions');
      console.log('   - Otherwise, verify your Integration Key, User ID, and Account ID');
    } else if (error.message.includes('invalid_client')) {
      console.log('\n💡 This error suggests invalid credentials:');
      console.log('   - Check your Integration Key');
      console.log('   - Verify your User ID');
      console.log('   - Ensure your RSA public key is registered in DocuSign');
    }
    
    return false;
  }
}

// Run the test
testDocuSignConfig()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });