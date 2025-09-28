const app = require('../server.js');

// Export a handler compatible with Vercel serverless functions (updated)
module.exports = async (req, res) => {
  // Forward the request to the Express app
  return app(req, res);
};
