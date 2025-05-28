require("dotenv").config();
const admin = require("firebase-admin");

const storeServiceAccount = {
  type: process.env.STORE_TYPE,
  project_id: process.env.STORE_PROJECT_ID,
  private_key_id: process.env.STORE_PRIVATE_KEY_ID,
  private_key: process.env.STORE_PRIVATE_KEY,
  client_email: process.env.STORE_CLIENT_EMAIL,
  client_id: process.env.STORE_CLIENT_ID,
  auth_uri: process.env.STORE_AUTH_URI,
  token_uri: process.env.STORE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.STORE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.STORE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.STORE_UNIVERSE_DOMAIN,
};

const deliveryServiceAccount = {
  type: process.env.DELIVERY_TYPE,
  project_id: process.env.DELIVERY_PROJECT_ID,
  private_key_id: process.env.DELIVERY_PRIVATE_KEY_ID,
  private_key: process.env.DELIVERY_PRIVATE_KEY,
  client_email: process.env.DELIVERY_CLIENT_EMAIL,
  client_id: process.env.DELIVERY_CLIENT_ID,
  auth_uri: process.env.DELIVERY_AUTH_URI,
  token_uri: process.env.DELIVERY_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.DELIVERY_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.DELIVERY_CLIENT_X509_CERT_URL,
  universe_domain: process.env.DELIVERY_UNIVERSE_DOMAIN,
};

const customerServiceAccount = {
  type: process.env.CUSTOMER_TYPE,
  project_id: process.env.CUSTOMER_PROJECT_ID,
  private_key_id: process.env.CUSTOMER_PRIVATE_KEY_ID,
  private_key: process.env.CUSTOMER_PRIVATE_KEY,
  client_email: process.env.CUSTOMER_CLIENT_EMAIL,
  client_id: process.env.CUSTOMER_CLIENT_ID,
  auth_uri: process.env.CUSTOMER_AUTH_URI,
  token_uri: process.env.CUSTOMER_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.CUSTOMER_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.CUSTOMER_CLIENT_X509_CERT_URL,
  universe_domain: process.env.CUSTOMER_UNIVERSE_DOMAIN,
};

const storeFirebase = admin.initializeApp(
  {
    credential: admin.credential.cert(storeServiceAccount),
  },
  "store"
);

// Initialize Delivery Firebase App
const deliveryFirebase = admin.initializeApp(
  {
    credential: admin.credential.cert(deliveryServiceAccount),
  },
  "delivery"
);

const customerFirebase = admin.initializeApp(
  {
    credential: admin.credential.cert(customerServiceAccount),
  },
  "customer"
);

module.exports = { storeFirebase, deliveryFirebase, customerFirebase };