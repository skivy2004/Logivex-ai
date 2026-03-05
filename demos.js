// demos.js
// Central configuration for all demo experiences exposed via the Demo Hub.
// Add or adjust demos here; the dashboard will update automatically.

const demos = [
  {
    id: 'transport-quote',
    name: 'Transport Quote Automation',
    description: 'Instant transport price calculation with Google Maps and Make.com integration.',
    url: '/quote-demo',
    category: 'Logistics'
  },
  {
    id: 'email-ai',
    name: 'AI Email Automation',
    description: 'Automatically generate professional logistics emails from a few bullet points.',
    url: '/email-demo',
    category: 'AI Automation'
  },
  {
    id: 'logistics-dashboard',
    name: 'Logistics KPI Dashboard',
    description: 'High-level overview of shipments, lanes and service levels.',
    url: '/logistics-dashboard',
    category: 'Analytics'
  },
  {
    id: 'crm-ai',
    name: 'AI CRM Automation',
    description: 'Connect deals, transports and follow-ups with AI-assisted workflows.',
    url: '/crm-ai-demo',
    category: 'AI Automation'
  }
];

module.exports = {
  demos
};

