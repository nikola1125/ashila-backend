// Minimal, dependency-free request-body validator.
// Usage: router.post('/', validateBody({ name: { type: 'string', required: true } }), handler)
//
// Supported rules per field:
//   type:     'string' | 'number' | 'boolean' | 'array' | 'object'
//   required: boolean
//   min/max:  number  (length for strings/arrays, value for numbers)
//   enum:     array of allowed values
//   email:    boolean (basic email shape check)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const checkField = (value, rule, key, errors) => {
  if (value === undefined || value === null || value === '') {
    if (rule.required) errors.push(`${key} is required`);
    return;
  }

  if (rule.type) {
    const actual = Array.isArray(value) ? 'array' : typeof value;
    if (actual !== rule.type) {
      errors.push(`${key} must be of type ${rule.type}`);
      return;
    }
  }

  if (rule.email && !EMAIL_RE.test(String(value))) {
    errors.push(`${key} must be a valid email`);
  }

  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${key} must be one of: ${rule.enum.join(', ')}`);
  }

  if (rule.min !== undefined) {
    const size = typeof value === 'number' ? value : value.length;
    if (size < rule.min) errors.push(`${key} must be at least ${rule.min}`);
  }

  if (rule.max !== undefined) {
    const size = typeof value === 'number' ? value : value.length;
    if (size > rule.max) errors.push(`${key} must be at most ${rule.max}`);
  }
};

const validateBody = (schema) => {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};
    for (const [key, rule] of Object.entries(schema)) {
      checkField(body[key], rule, key, errors);
    }
    if (errors.length) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    next();
  };
};

module.exports = { validateBody };
