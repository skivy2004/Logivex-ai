// config/env.js
// Environment variable validation and configuration

const requiredEnvVars = [
  'GOOGLE_MAPS_API_KEY',
  'N8N_WEBHOOK_TRANSPORT_QUOTE'
];

const optionalEnvVars = [
  'DEMOS_API_URL',
  'N8N_WEBHOOK_CONTACT',
  'N8N_WEBHOOK_AUTOMATION_INTAKE',
  'N8N_WEBHOOK_EMAIL',
  'N8N_WEBHOOK_EMAIL_AUTOMATION',
  'N8N_WEBHOOK_DEMO_REQUEST',
  'N8N_WEBHOOK_CRM_AI',
  'OPENAI_API_KEY',
  'SAMPLE_EMAIL_PROMPT',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PORT'
];

function validateEnvironment() {
  const missing = [];
  const warnings = [];

  // Check required environment variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check optional environment variables and warn if missing
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });

  // Report missing required variables
  if (missing.length > 0) {
    console.error('\n❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease add these variables to your .env file.');
    console.error('Copy .env.example to .env and fill in the values.\n');
    process.exit(1);
  }

  // Report missing optional variables
  if (warnings.length > 0) {
    console.warn('\n⚠️  OPTIONAL ENVIRONMENT VARIABLES NOT SET:');
    warnings.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn('\nThese variables are optional but may be needed for full functionality.\n');
  }

  // Log configuration summary
  console.log('\n✅ Environment configuration validated successfully');
  console.log(`   - Server Port: ${process.env.PORT || 3000}`);
  console.log(`   - Google Maps API: ${process.env.GOOGLE_MAPS_API_KEY ? '✓ Configured' : '✗ Missing'}`);
  console.log(`   - Transport Quote Webhook (n8n): ${process.env.N8N_WEBHOOK_TRANSPORT_QUOTE ? '✓ Configured' : '✗ Missing'}`);
  console.log(`   - Contact Webhook (n8n): ${process.env.N8N_WEBHOOK_CONTACT ? '✓ Configured' : 'Optional'}`);
  console.log(`   - Automation Intake Webhook (n8n): ${process.env.N8N_WEBHOOK_AUTOMATION_INTAKE ? '✓ Configured' : 'Optional'}`);
  console.log(`   - Email extraction Webhook (n8n): ${process.env.N8N_WEBHOOK_EMAIL ? '✓ Configured' : 'Optional'}`);
  console.log(`   - Email Automation Webhook (n8n): ${process.env.N8N_WEBHOOK_EMAIL_AUTOMATION ? '✓ Configured' : 'Optional'}`);
  console.log(`   - Demo Request Webhook (n8n): ${process.env.N8N_WEBHOOK_DEMO_REQUEST ? '✓ Configured' : 'Optional'}`);
  console.log(`   - CRM AI Webhook (n8n): ${process.env.N8N_WEBHOOK_CRM_AI ? '✓ Configured' : 'Optional'}`);
  console.log(`   - OpenAI API: ${process.env.OPENAI_API_KEY ? '✓ Configured' : 'Optional (demo mode)'}`);
  console.log(`   - Sample email prompt: ${process.env.SAMPLE_EMAIL_PROMPT ? '✓ Set' : 'Optional (email-demo AI example)'}`);
  console.log(`   - Supabase: ${process.env.SUPABASE_URL ? '✓ Configured' : 'Optional (auth & features)'}`);
  console.log('');
}

function getConfig() {
  return {
    port: process.env.PORT || 3000,
    demosApiUrl: process.env.DEMOS_API_URL || 'https://logivex-ai.vercel.app/api/demos',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    sampleEmailPrompt: process.env.SAMPLE_EMAIL_PROMPT ? String(process.env.SAMPLE_EMAIL_PROMPT).trim() : '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    webhooks: {
      n8nTransportQuote: process.env.N8N_WEBHOOK_TRANSPORT_QUOTE,
      n8nContact: process.env.N8N_WEBHOOK_CONTACT,
      n8nAutomationIntake: process.env.N8N_WEBHOOK_AUTOMATION_INTAKE,
      n8nEmail: process.env.N8N_WEBHOOK_EMAIL,
      n8nEmailAutomation: process.env.N8N_WEBHOOK_EMAIL_AUTOMATION,
      n8nDemoRequest: process.env.N8N_WEBHOOK_DEMO_REQUEST,
      n8nCrmAi: process.env.N8N_WEBHOOK_CRM_AI
    }
  };
}

module.exports = {
  validateEnvironment,
  getConfig,
  requiredEnvVars,
  optionalEnvVars
};
