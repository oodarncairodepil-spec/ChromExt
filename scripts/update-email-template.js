const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// You'll need to get a personal access token from https://supabase.com/dashboard/account/tokens
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = 'oeikkeghjcclwgqzsvou'; // Your project reference ID

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Missing SUPABASE_ACCESS_TOKEN in .env file');
  console.log('📝 Get your access token from: https://supabase.com/dashboard/account/tokens');
  console.log('📝 Add it to your .env file as: SUPABASE_ACCESS_TOKEN=your-token-here');
  process.exit(1);
}

async function updateEmailTemplate() {
  try {
    // Read the custom email template
    const templatePath = path.join(__dirname, 'supabase', 'email-templates', 'confirm-signup.html');
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    
    console.log('📧 Updating Supabase email template...');
    
    // Update the email template using Supabase Management API
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'mailer_templates_confirmation_content': templateContent,
        'mailer_templates_confirmation_subject': 'Confirm Your Signup - Access Token Inside'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }
    
    const result = await response.json();
    console.log('✅ Email template updated successfully!');
    console.log('📝 Template now includes:');
    console.log('   - Separated access token display');
    console.log('   - Copy button for easy token copying');
    console.log('   - Step-by-step instructions');
    console.log('   - Alternative confirmation link');
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to update email template:', error.message);
    
    if (error.message.includes('401')) {
      console.log('🔑 Authentication failed. Please check your SUPABASE_ACCESS_TOKEN.');
      console.log('📝 Get a new token from: https://supabase.com/dashboard/account/tokens');
    } else if (error.message.includes('403')) {
      console.log('🚫 Permission denied. Make sure your token has the necessary permissions.');
    } else if (error.message.includes('404')) {
      console.log('🔍 Project not found. Please check your PROJECT_REF.');
    }
    
    process.exit(1);
  }
}

// Function to get current email templates (for debugging)
async function getCurrentTemplates() {
  try {
    console.log('📋 Fetching current email templates...');
    
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const config = await response.json();
    
    // Filter only email template related configs
    const emailTemplates = Object.entries(config)
      .filter(([key]) => key.startsWith('mailer_templates'))
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
    
    console.log('📧 Current email template configuration:');
    console.log(JSON.stringify(emailTemplates, null, 2));
    
    return emailTemplates;
    
  } catch (error) {
    console.error('❌ Failed to fetch current templates:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--get-current')) {
    await getCurrentTemplates();
  } else if (args.includes('--update')) {
    await updateEmailTemplate();
  } else {
    console.log('📧 Supabase Email Template Updater');
    console.log('');
    console.log('Usage:');
    console.log('  node update-email-template.js --update     # Update the email template');
    console.log('  node update-email-template.js --get-current # Get current templates');
    console.log('');
    console.log('Prerequisites:');
    console.log('1. Get your personal access token from: https://supabase.com/dashboard/account/tokens');
    console.log('2. Add it to your .env file as: SUPABASE_ACCESS_TOKEN=your-token-here');
    console.log('3. Run the update command');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateEmailTemplate,
  getCurrentTemplates
};