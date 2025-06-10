// index.js
const express = require("express");
const dotEnv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const session = require("express-session");
const sequelize = require("./config/db");
const PORT = process.env.PORT || 5001;
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const helmet = require("helmet");
const xss = require("xss-clean");
const csrf = require("csurf");
const rateLimit = require("express-rate-limit");
const swaggerFile = require("./swagger-op.json");
const radisConnect = require("./config/connectRedis");
const app = express();
const http = require("http");
const socketSetup = require("./sockets");
const server = http.createServer(app);

const csrfProtection = csrf({ cookie: true });
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: "Too many requests from this IP, please try again later.",
});

app.use(morgan("dev"));
dotEnv.config();
app.use(helmet());
app.use(xss());
app.use(apiLimiter);
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));

// Serve Swagger UI
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerFile, {
    customCssUrl: "https://unpkg.com/swagger-ui-dist@4/swagger-ui.css",
    customJs: [
      "https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js",
      "https://unpkg.com/swagger-ui-dist@4/swagger-ui-standalone-preset.js",
    ],
  })
);

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "https://kine-milk-client.vercel.app",
      "https://kine-client-dev.vercel.app",
      "https://kine-server-dev.vercel.app",
      "https://kine-milk-client-sage.vercel.app",
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

sequelize
  .sync()
  .then(() => {
    console.log("Database & tables created!");
  })
  .catch((err) => {
    console.error("Unable to create the database:", err);
  });

const index = require("./Models/index");

// Admin Routes
app.use("/admin", require("./AdminRoutes/Auth_route"));
app.use("/illustration", require("./AdminRoutes/illustrationRoutes"));
app.use("/ads", require("./AdminRoutes/Ads.route"));
app.use("/carrybag", require("./AdminRoutes/Carrybag.route"));
app.use("/storedash", require("./AdminRoutes/StoreDashboard.route"));
app.use("/admindash", require("./AdminRoutes/Dashboard.route"));
app.use("/settings", require("./AdminRoutes/Settings.route"));
app.use("/category", require("./AdminRoutes/Category.route"));
app.use("/product", require("./AdminRoutes/Product.route"));
app.use("/product-images", require("./AdminRoutes/ProductImages.route"));
app.use("/delivery", require("./AdminRoutes/Delivery.route"));
app.use("/coupon", require("./AdminRoutes/Couppon.route"));
app.use("/rider", require("./AdminRoutes/Rider.route"));
app.use("/faq", require("./AdminRoutes/Faq.route"));
app.use("/time", require("./AdminRoutes/Time.route"));
app.use("/rider-time", require("./AdminRoutes/RiderTimeSlots.route"));
app.use("/normalorder", require("./AdminRoutes/NormalOrder.route"));
app.use("/subscribeorders", require("./AdminRoutes/Subscribeorder.router"));
app.use("/banner", require("./AdminRoutes/Banner.route"));
app.use("/store", require("./AdminRoutes/Store.route"));
app.use("/user", require("./AdminRoutes/User.route"));
app.use("/productinventory", require("./AdminRoutes/ProductInventory_route"));
app.use("/storeweightoption", require("./AdminRoutes/StoreWeight.route"));
app.use("/notifications", require("./UserRoutes/notification_route"));
app.use("/orders", require("./AdminRoutes/Order.route"));
app.use("/payments", require("./AdminRoutes/paymentRoutes"));
app.use("/", require("./AdminRoutes/stockRoutes"));
app.use("/", require("./AdminRoutes/Unit.route"));
app.use("/rider-reports", require("./AdminRoutes/RideReports.route"));
app.use("/orders", require("./AdminRoutes/StoreOrderReports.route"));
app.use("/payments", require("./AdminRoutes/StorePaymentReport.route"));
app.use("/api", require("./AdminRoutes/StoreStockReport.route"));

// User Routes
app.use("/user", require("./UserRoutes/user_auth_route"));
app.use("/customer", require("./UserRoutes/customer/customer_auth_routes"));
app.use("/home_data", require("./UserRoutes/customer/home_data_route"));
app.use("/u_product", require("./UserRoutes/customer/product_route"));
app.use("/u_address", require("./UserRoutes/customer/address_route"));
app.use("/u_cart", require("./UserRoutes/customer/cart_route"));
app.use("/u_sub_order", require("./UserRoutes/customer/subscribeOrder_route"));
app.use(require("./UserRoutes/customer/instantOrder_route"));
app.use("/u_fav", require("./UserRoutes/customer/fav_route"));
app.use("/u_timeslot", require("./UserRoutes/customer/timeslot_route"));
app.use("/reviews", require("./UserRoutes/customer/customer_review_routes"));
app.use("/u_wallet", require("./UserRoutes/customer/wallet_route"));
app.use("/u_customersupport", require("./UserRoutes/customer/customerSupport_route"));
app.use("/u_faq", require("./UserRoutes/customer/faq_route"));
app.use(require("./UserRoutes/SettingsRoutes/Charges.route"));

// Stores
app.use("/stores", require("./UserRoutes/Store/store_dashboard_routes"));
app.use("/store-products", require("./UserRoutes/Store/store_product_routes"));
app.use("/store-rider", require("./UserRoutes/Store/store_rider_routes"));
app.use("/store-owner", require("./UserRoutes/Store/store_user_routes"));
app.use("/store-instant", require("./UserRoutes/Store/store_instant_orders_route"));
app.use("/store-inventory", require("./UserRoutes/Store/store_inventory_routes"));
app.use("/instant-orders", require("./UserRoutes/Store/instant_order_history_routes"));
app.use("/subscribe-orders", require("./UserRoutes/Store/subscribe_orders_routes"));

// Delivery
app.use("/delivery", require("./UserRoutes/Delivery/rider_auth_routes"));
app.use("/deliveries", require("./UserRoutes/Delivery/delivery_dashboard_routes"));
app.use("/instant-delivery", require("./UserRoutes/Delivery/instant_delivery_order_routes"));
app.use("/subscribe-delivery", require("./UserRoutes/Delivery/subcribe_delivery_order_routes"));
app.use("/u_settings", require("./UserRoutes/customer/settings_route"));
app.use("/order-delivered", require("./UserRoutes/Delivery/order_delivered_routes"));

// Settings
app.use("/policies", require("./UserRoutes/SettingsRoutes/Settings.route"));

app.get("/", (req, res) => {
  res.send("Server is Running");
});



const startServer = async () => {
  let redisClient;
  try {
    redisClient = await radisConnect();
    
    // Test Redis endpoint
    app.get('/test-redis', async (req, res) => {
      try {
        await redisClient.set('greeting', 'Hello from Upstash Redis!');
        const val = await redisClient.get('greeting');
        res.send({ message: val });
      } catch (err) {
        res.status(500).send({ error: 'Redis error', details: err.message });
      }
    });
    // Attach Redis client to app.locals if needed elsewhere in Express
    app.locals.redisClient = redisClient;
    const io = socketSetup(server, redisClient);
    app.set("io", io);

    server.listen(PORT, () => {
      console.log(`🚀 Server is Running on PORT http://localhost:${PORT}`);
      console.log(`📘 Swagger docs available at http://localhost:${PORT}/api-docs`);
    });

    const shutdown = async () => {
      console.info("🛑 Shutting down...");  
      try {
        await redisClient.quit();
        server.close(() => {
          console.info("✅ Server shut down cleanly");
          process.exit(0);
        });
      } catch (err) {
        console.error("❌ Shutdown error:", err.message);
        process.exit(1);
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error(`❌ Failed to start server: ${err.message}`);
    if (redisClient) await redisClient.quit();
    process.exit(1);
  }
};



startServer(); 