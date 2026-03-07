const demos = require('../data/demo-config');

module.exports = function handler(req, res) {
  res.status(200).json(demos);
};