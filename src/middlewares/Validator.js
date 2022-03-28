const validator = (resourceSchema) => async (req, res, next) => {
  const resource = req.body;
  try {
    // throws an error if not valid
    await resourceSchema.validate(resource);
    next();
  } catch (e) {
    res.status(400).json({ error: e.errors.join(', ') });
  }
};

module.exports = validator;
