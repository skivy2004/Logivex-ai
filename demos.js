// demos.js
// Central configuration for all demo experiences exposed via the Demo Hub.
// Add or adjust demos here; the dashboard will update automatically.

const demos = [
  {
    id: 'transport-quote',
    name: 'Transport Quote Automation',
    description: 'Instant transport price calculation with Google Maps and Make.com integration.',
    url: '/quote-demo',
    category: 'Logistics',
    status: 'online'
  },
  {
    id: 'extract-order',
    name: 'Email → Order AI',
    description: 'Upload or paste a transport request email and let AI extract the shipment details automatically.',
    url: '/extract-order-demo',
    category: 'AI Automation',
    status: 'beta'
  },
  {
    id: 'email-ai',
    name: 'AI Email Automation',
    description: 'Automatically generate professional logistics emails from a few bullet points.',
    url: '/email-demo',
    category: 'AI Automation',
    status: 'coming_soon'
  },
  {
    id: 'logistics-dashboard',
    name: 'Logistics KPI Dashboard',
    description: 'High-level overview of shipments, lanes and service levels.',
    url: '/logistics-dashboard',
    category: 'Analytics',
    status: 'coming_soon'
  },
  {
    id: 'crm-ai',
    name: 'AI CRM Automation',
    description: 'Connect deals, transports and follow-ups with AI-assisted workflows.',
    url: '/crm-ai-demo',
    category: 'AI Automation',
    status: 'coming_soon'
  }
];

module.exports = {
  demos
};

