// Restricted JSON Schema vocabulary used by the bundled schema; not a general validator.
function validate(value, schema, location = '$') {
  const errors = [];
  const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (schema.type && actual !== schema.type) return [`${location}: expected ${schema.type}`];
  if (schema.const !== undefined && value !== schema.const) errors.push(`${location}: invalid constant`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${location}: invalid enum`);
  if (actual === 'string' && schema.minLength && value.trim().length < schema.minLength) errors.push(`${location}: empty string`);
  if (actual === 'object') {
    for (const key of schema.required || []) if (!(key in value)) errors.push(`${location}.${key}: required`);
    for (const key of Object.keys(value)) {
      if (schema.properties?.[key]) errors.push(...validate(value[key], schema.properties[key], `${location}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${location}.${key}: unknown property`);
    }
  }
  if (actual === 'array') {
    if (schema.minItems && value.length < schema.minItems) errors.push(`${location}: too few items`);
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) errors.push(`${location}: duplicates`);
    value.forEach((item, index) => errors.push(...validate(item, schema.items, `${location}[${index}]`)));
  }
  return errors;
}
module.exports = { validate };
