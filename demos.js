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
    id: 'ai-routing',
    name: 'AI Routing Agent',
    description: 'AI-powered route optimization with carrier matching, scoring, and intelligent recommendations.',
    url: '/routing-demo',
    category: 'AI Automation',
    status: 'beta'
  },
  {
    id: 'email-extract',
    name: 'AI Email → Transport Order Extraction',
    description: 'Paste a logistics email and let AI convert it into a structured transport order.',
    url: '/email-demo',
    category: 'AI Automation',
    status: 'online'
  },
  {
    id: 'logistics-dashboard',
    name: 'Logistics KPI Dashboard',
    description: 'Get a high-level overview of shipments, routes and operational metrics.',
    url: '/logistics-dashboard',
    category: 'Analytics',
    status: 'online'
  },
  {
    id: 'crm-ai',
    name: 'AI CRM Automation',
    description: 'Extract lead information from messages and create CRM contacts automatically with AI.',
    url: '/crm-demo',
    category: 'AI Automation',
    status: 'beta'
  }
];

module.exports = {
  demos
};

