/**
 * Input validation and sanitization for API requests.
 */

const MAX_EMAIL_LENGTH = 50000;

/**
 * Sanitize email text for extraction: trim and length limit.
 * @param {*} value - Raw input
 * @returns {{ valid: boolean, value?: string, error?: string }}
 */
function sanitizeEmailText(value) {
  if (value == null) return { valid: false, error: 'Email text is required' };
  if (typeof value !== 'string') return { valid: false, error: 'Email text must be a string' };
  const trimmed = value.trim();
  if (!trimmed.length) return { valid: false, error: 'Email text cannot be empty' };
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: `Email text must be under ${MAX_EMAIL_LENGTH} characters` };
  }
  return { valid: true, value: trimmed };
}

module.exports = {
  sanitizeEmailText,
  MAX_EMAIL_LENGTH
};
