// Recursively strips MongoDB operator keys ($...) and dotted keys (a.b) from
// untrusted input so attackers cannot inject query operators (NoSQL injection).
// Mutates objects in place to stay compatible with Express getter-only req.query.

const isPlainObject = (val) =>
  val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date);

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    value.forEach(sanitizeValue);
    return value;
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
      } else {
        sanitizeValue(value[key]);
      }
    }
  }
  return value;
};

const mongoSanitize = (req, res, next) => {
  if (req.body) sanitizeValue(req.body);
  if (req.params) sanitizeValue(req.params);
  // req.query is a getter in some setups; mutate its contents rather than reassign
  if (req.query) sanitizeValue(req.query);
  next();
};

module.exports = { mongoSanitize, sanitizeValue };
