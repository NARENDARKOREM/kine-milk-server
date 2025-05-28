// swagger.js
const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });
require('dotenv').config();
const ENV = process.env.NODE_ENV || 'development';
console.log('NODE_ENV:', ENV);
console.log('Swagger host:', ENV === 'production' ? 'https://kine-server-dev.vercel.app' : 'http://localhost:5001');

const doc = {
  info: {
    title: 'Kine Milk API',
    description: 'API documentation for Kine Milk application',
    version: '1.0.0',
  },
  servers: [
    {
      url: ENV === 'production' ? 'https://kine-server-dev.vercel.app' : 'http://localhost:5001',
      description: ENV === 'production' ? 'Production server' : 'Local server',
    },
  ],
  basePath: '/',
};

const outputFile = './swagger-op.json';
const endpointsFiles = [
  './index.js',
];

swaggerAutogen(outputFile, endpointsFiles, doc)
  .then(() => {
    console.log('✅ Swagger documentation generated successfully');
  })
  .catch((err) => {
    console.error('❌ Swagger-autogen failed with error:', err);
    process.exit(1);
  });