// config/env.js
// Shared environment access for serverless handlers.

const requiredEnvVars = ['GOOGLE_MAPS_API_KEY', 'N8N_WEBHOOK_TRANSPORT_QUOTE'];

const optionalEnvVars = [
  'GOOGLE_API_KEY',
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
  'SUPABASE_SERVICE_ROLE_KEY'
];

function validateEnvironment() {
  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);
  const warnings = optionalEnvVars.filter((varName) => !process.env[varName]);

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

function getConfig() {
  return {
    demosApiUrl: process.env.DEMOS_API_URL || 'https://logivex-ai.vercel.app/api/demos',
    googleMapsApiKey: process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    sampleEmailPrompt: process.env.SAMPLE_EMAIL_PROMPT ? String(process.env.SAMPLE_EMAIL_PROMPT).trim() : '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    webhooks: {
      n8nTransportQuote: process.env.N8N_WEBHOOK_TRANSPORT_QUOTE || '',
      n8nContact: process.env.N8N_WEBHOOK_CONTACT || '',
      n8nAutomationIntake: process.env.N8N_WEBHOOK_AUTOMATION_INTAKE || '',
      n8nEmail: process.env.N8N_WEBHOOK_EMAIL || '',
      n8nEmailAutomation: process.env.N8N_WEBHOOK_EMAIL_AUTOMATION || '',
      n8nDemoRequest: process.env.N8N_WEBHOOK_DEMO_REQUEST || '',
      n8nCrmAi: process.env.N8N_WEBHOOK_CRM_AI || ''
    }
  };
}

module.exports = {
  validateEnvironment,
  getConfig,
  requiredEnvVars,
  optionalEnvVars
};
