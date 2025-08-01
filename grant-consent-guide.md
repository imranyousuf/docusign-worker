# Grant DocuSign Application Consent

## Method 1: Through DocuSign Admin (Recommended)

1. **Go to DocuSign Admin**: https://admindemo.docusign.com
2. **Login** with your DocuSign developer account
3. **Navigate to**: Apps and Keys
4. **Find your application** (with Integration Key: 7febc2b8-e2ef-4052-84f7-511d4d1182f3)
5. **Click "Actions"** → **"Grant Admin Consent"**
6. **Confirm** the consent

## Method 2: Individual User Consent URL

Try this URL in your browser:
```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=7febc2b8-e2ef-4052-84f7-511d4d1182f3&redirect_uri=https://developers.docusign.com/platform/auth/consent
```

## Method 3: Alternative Consent URL

If the above doesn't work, try:
```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature&client_id=7febc2b8-e2ef-4052-84f7-511d4d1182f3&redirect_uri=https://www.google.com
```

## Method 4: DocuSign Developer Console

1. Go to https://developers.docusign.com/
2. Login and go to your app
3. Look for "Grant Consent" or "User Consent" section
4. Follow the prompts

## After Granting Consent

Run this command to test:
```bash
node test-docusign.js
```

If successful, you should see:
```
✅ JWT token obtained successfully!
🎉 DocuSign configuration test completed successfully!
```