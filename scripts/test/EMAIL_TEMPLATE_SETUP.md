# Supabase Email Template Setup

This guide explains how to apply the custom email template that separates the access token from the confirmation URL and adds a copy button.

## Prerequisites

1. **Supabase Personal Access Token**: Get one from [Supabase Dashboard > Account > Access Tokens](https://supabase.com/dashboard/account/tokens)
2. **Node.js**: Required to run the update script
3. **Project Access**: You need admin access to your Supabase project

## Setup Steps

### 1. Add Environment Variable

Create or update your `.env` file in the project root:

```bash
# Add this line to your .env file
SUPABASE_ACCESS_TOKEN=your-personal-access-token-here
```

### 2. Install Dependencies (if needed)

```bash
npm install @supabase/supabase-js dotenv
```

### 3. Apply the Custom Email Template

Run the update script:

```bash
# Update the email template
node update-email-template.js --update

# Or check current templates first
node update-email-template.js --get-current
```

## What the Custom Template Includes

✅ **Separated Access Token**: The token is displayed separately from the confirmation URL  
✅ **Copy Button**: JavaScript-powered copy functionality for easy token copying  
✅ **Clear Instructions**: Step-by-step guide for users  
✅ **Fallback Option**: Traditional confirmation link still available  
✅ **Professional Styling**: Clean, responsive design  

## Template Features

### Token Display
```html
<div class="token-section">
  <h3>🔑 Your Access Token</h3>
  <div class="token-container">
    <code id="access-token">{{ .Token }}</code>
    <button onclick="copyToken()" class="copy-btn">📋 Copy Token</button>
  </div>
</div>
```

### Copy Functionality
- One-click token copying
- Visual feedback when copied
- Fallback for older browsers

### User Instructions
- Clear step-by-step process
- Chrome extension specific guidance
- Token expiration notice

## Testing the Flow

1. **Sign up a new user** through your application
2. **Check email** for the new template format
3. **Copy token** using the copy button
4. **Paste token** in the Chrome extension's token confirmation page
5. **Verify authentication** works correctly

## Troubleshooting

### Authentication Errors
- Verify your `SUPABASE_ACCESS_TOKEN` is correct
- Check token permissions in Supabase dashboard
- Ensure you have admin access to the project

### Template Not Updating
- Run `node update-email-template.js --get-current` to check current state
- Verify the template file exists at `supabase/email-templates/confirm-signup.html`
- Check Supabase project reference ID in the script

### Email Not Received
- Check spam/junk folders
- Verify email settings in Supabase Auth configuration
- Test with different email providers

## Manual Alternative

If the script doesn't work, you can manually update the template:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication > Email Templates**
4. Select **Confirm signup** template
5. Replace the content with the template from `supabase/email-templates/confirm-signup.html`
6. Save changes

## Security Notes

- Tokens expire in 24 hours for security
- Never share your personal access token
- The email template is served over HTTPS
- Copy functionality works client-side only

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify all prerequisites are met
3. Test with a fresh email address
4. Contact support if problems persist