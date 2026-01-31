const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nimonspedia Node Backend API',
      version: '1.0.0',
      description: 'Node.js REST API backend for Nimonspedia e-commerce platform',
    },
    servers: [
      {
        url: process.env.API_HOST || 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // files containing annotations as above
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
