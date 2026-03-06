// demos.js
// Central configuration for all demo experiences exposed via the Demo Hub.
// Add or adjust demos here; the dashboard will update automatically.

const demos = [
  {
    id: 'transport-quote',
    name: 'Transport Quote Automation',
    description: 'Instantly calculate transport prices using Google Maps distance and shipment data.',
    url: '/quote-demo',
    category: 'Logistics',
    status: 'online'
  },
  {
    id: 'extract-order',
    name: 'Email → Order AI',
    description: 'Upload or paste a transport request email and let AI extract shipment details automatically.',
    url: '/extract-order-demo',
    category: 'AI Automation',
    status: 'beta'
  },
  {
    id: 'email-ai',
    name: 'AI Email Automation',
    description: 'Generate professional logistics emails from simple bullet points.',
    url: '/email-demo',
    category: 'AI Automation',
    status: 'coming_soon'
  },
  {
    id: 'logistics-dashboard',
    name: 'Logistics KPI Dashboard',
    description: 'Get a high-level overview of shipments, routes and operational metrics.',
    url: '/logistics-dashboard',
    category: 'Analytics',
    status: 'coming_soon'
  },
  {
    id: 'crm-ai',
    name: 'AI CRM Automation',
    description: 'Connect deals, shipments and follow-ups with AI-assisted workflows.',
    url: '/crm-ai-demo',
    category: 'AI Automation',
    status: 'coming_soon'
  }
];

module.exports = {
  demos
};

