/**
 * OpenAI API client for extraction. Uses OPENAI_API_KEY from env.
 * Model: gpt-4o-mini.
 */

const logger = require('../utils/logger');

const MODEL = 'gpt-4o-mini';
const EXTRACT_SYSTEM_PROMPT = `You are a logistics data extraction assistant. Extract transport order details from the provided email text.

Return ONLY a valid JSON object with exactly these keys (use null for any missing value):
- pickup_location (string, e.g. city or address)
- delivery_location (string)
- cargo_type (string, e.g. "pallets", "boxes", "other")
- quantity (number or null)
- weight (string with unit, e.g. "4800kg", or null)
- pickup_time (string, e.g. "tomorrow 08:00", or null)

Rules:
- No markdown, no code fences, no explanation. Only the JSON object.
- Numbers as numbers, not strings, except weight which is a string with unit.`;

/**
 * Call OpenAI Chat Completions for extraction.
 * @param {string} emailText - Sanitized email body
 * @param {string} apiKey - From env, never logged
 * @returns {Promise<object|null>} Parsed JSON or null on failure
 */
async function extractTransportOrder(emailText, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !emailText) {
    logger.warn('OpenAI extract skipped', { reason: 'missing_api_key_or_input' });
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
          { role: 'user', content: emailText }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody.error?.message || `HTTP ${response.status}`;
      logger.error('OpenAI API error', { status: response.status, message: msg });
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      logger.warn('OpenAI empty or invalid content');
      return null;
    }

    const trimmed = content.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      logger.info('OpenAI extraction succeeded');
      return parsed;
    }
    return null;
  } catch (err) {
    logger.error('OpenAI request failed', { error: err.message });
    return null;
  }
}

const LEAD_EXTRACT_SYSTEM_PROMPT = `You are a CRM lead extraction assistant. Extract lead/contact information from the provided message.

Return ONLY a valid JSON object with exactly these keys (use null for any missing value):
- name (string, full name of the person)
- company (string, company or organization name)
- email (string or null)
- phone (string or null)
- industry (string, e.g. "Logistics", "Transport", or null)
- location (string, city/region/country or null)
- lead_intent (string, brief summary of what they want or are interested in)
- lead_priority (string: "High", "Medium", or "Low" based on urgency and fit)

Rules:
- No markdown, no code fences, no explanation. Only the JSON object.
- Infer industry and location from context when possible.`;

/**
 * Extract lead data from a message using OpenAI.
 * @param {string} messageText - Raw message body
 * @param {string} apiKey - OpenAI API key from env
 * @returns {Promise<object|null>} Parsed lead object or null
 */
async function extractLeadFromMessage(messageText, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !messageText) {
    logger.warn('OpenAI lead extract skipped', { reason: 'missing_api_key_or_input' });
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: LEAD_EXTRACT_SYSTEM_PROMPT },
          { role: 'user', content: messageText }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody.error?.message || `HTTP ${response.status}`;
      logger.error('OpenAI API error (lead)', { status: response.status, message: msg });
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      logger.warn('OpenAI empty or invalid content (lead)');
      return null;
    }

    const trimmed = content.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      logger.info('OpenAI lead extraction succeeded');
      return parsed;
    }
    return null;
  } catch (err) {
    logger.error('OpenAI lead request failed', { error: err.message });
    return null;
  }
}

const GENERATE_EMAIL_SYSTEM_PROMPT = `You are a helpful assistant that writes realistic, short transport/logistics request emails.

Given a user prompt describing the kind of email they want, write a single plain-text email that could be sent by a customer requesting transport. The email should:
- Be 2–8 sentences, natural and varied (different names, companies, cities, cargo details each time)
- Include concrete logistics details: pickup/delivery locations, cargo type (e.g. pallets, boxes), weight, and optionally pickup time
- Sound like a real business email (greeting, brief request, sign-off)
- Be in English unless the user prompt asks for another language

Return ONLY the raw email text. No quotes, no "Here is the email:", no markdown, no code blocks.`;

/**
 * Generate a sample transport email from a user prompt.
 * @param {string} prompt - User description (e.g. "Berlin to Munich, 5 pallets")
 * @param {string} apiKey - OpenAI API key from env
 * @returns {Promise<string|null>} Generated email text or null
 */
async function generateSampleEmail(prompt, apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    logger.warn('OpenAI generate sample email skipped', { reason: 'missing_api_key' });
    return null;
  }
  const trimmedPrompt = typeof prompt === 'string' ? prompt.trim() : '';
  if (!trimmedPrompt) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: GENERATE_EMAIL_SYSTEM_PROMPT },
          { role: 'user', content: trimmedPrompt }
        ],
        temperature: 0.8,
        max_tokens: 400
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody.error?.message || `HTTP ${response.status}`;
      logger.error('OpenAI API error (generate email)', { status: response.status, message: msg });
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      logger.warn('OpenAI empty content (generate email)');
      return null;
    }

    const email = content.trim().replace(/^["']|["']$/g, '').trim();
    logger.info('OpenAI sample email generated');
    return email || null;
  } catch (err) {
    logger.error('OpenAI generate email failed', { error: err.message });
    return null;
  }
}

module.exports = {
  extractTransportOrder,
  extractLeadFromMessage,
  generateSampleEmail,
  MODEL
};
