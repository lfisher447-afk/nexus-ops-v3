// Update security headers in Express application

const express = require('express');
const helmet = require('helmet');

const app = express();

// Example of setting security headers
app.use(helmet());

// Content Security Policy (CSP) with iframe support
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    frameAncestors: ["'self'", "https://example.com"], // replace with valid sources
  }
}));

// ... other middlewares and routes

app.listen(3000, () => {
  console.log('Server running on port 3000');
});