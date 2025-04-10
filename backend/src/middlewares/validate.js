module.exports = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    next();
  } catch (err) {
    const formatted = err.errors?.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({ error: 'Validation failed', details: formatted });
  }
};
