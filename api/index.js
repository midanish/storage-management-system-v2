const express = require('express');
const app = require('../server.js');

// Export a handler compatible with Vercel serverless functions
module.exports = async (req, res) => {
  return new Promise((resolve, reject) => {
    app(req, res, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};
