// Ensure Express is required in this file so Vercel's scanner detects it
const express = require('express');

// Vercel serverless function entrypoint that directly uses the Express app
// The `server.js` file exports the Express app when running on Vercel (process.env.VERCEL)
const app = require('../server.js');

// Export the app as the Vercel function handler
module.exports = app;
