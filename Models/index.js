// const Admin = require("./Admin");
// const Category = require("./Category");
// const Product = require("./Product");
const Address = require("./Address");
const Cart = require("./Cart");
const Category = require("./Category");
const Favorite = require("./Favorite");
const NormalOrder = require("./NormalOrder");
const NormalOrderProduct = require("./NormalOrderProduct");
const Product = require("./Product");
const ProductImage = require("./productImages");
const ProductInventory = require("./ProductInventory");
const ProductReivew = require("./ProductReview");
const Review = require("./review");
const Rider = require("./Rider");
const Time = require("./Time");
const Coupon = require("./Coupon");
// const User = require("./User");
// const PaymentList = require("./PaymentList");
// const Coupon = require('./Coupon');
// const Rider = require('./Rider');
// const SubscribeOrder = require('./SubscribeOrder');
// const ProductAttribute = require("./ProductAttribute");

const Store = require("./Store");
const SubscribeOrder = require("./SubscribeOrder");
const SubscribeOrderProduct = require("./SubscribeOrderProduct");
const User = require("./User");
const StoreWeightOptionHistory = require("./StoreWeightOptionHistory");
// const ProductImage = require("./productImages");

// const Store = require("./Store");

Product.belongsTo(Category, { as: "category", foreignKey: "cat_id" });
Category.hasMany(Product, { as: "products", foreignKey: "cat_id" });

ProductImage.belongsTo(Product, {
  as: "extraImages",
  foreignKey: "product_id",
});
Product.hasMany(ProductImage, { as: "extraImages", foreignKey: "product_id" });

NormalOrder.belongsTo(Store, { as: "store", foreignKey: "store_id" });
Store.hasMany(NormalOrder, { as: "store", foreignKey: "store_id" });

NormalOrder.belongsTo(User, { as: "user", foreignKey: "uid" });
User.hasMany(NormalOrder, { as: "orders", foreignKey: "uid" });

NormalOrderProduct.belongsTo(NormalOrder, {
  foreignKey: "oid",
  as: "NormalProducts",
});
NormalOrder.hasMany(NormalOrderProduct, {
  foreignKey: "oid",
  as: "NormalProducts",
});

NormalOrderProduct.belongsTo(Product, {
  foreignKey: "product_id",
  as: "ProductDetails",
});

SubscribeOrder.hasMany(SubscribeOrderProduct, {
  foreignKey: "oid",
  as: "orderProducts",
});
SubscribeOrderProduct.belongsTo(Product, {
  foreignKey: "product_id",
  as: "productDetails",
});

Cart.belongsTo(Product, { foreignKey: "product_id", as: "CartproductDetails" });
Product.hasMany(Cart, { foreignKey: "product_id" });

Product.hasMany(NormalOrder, {
  foreignKey: "product_id",
  as: "product_orders",
});
NormalOrder.belongsTo(Product, {
  foreignKey: "product_id",
  as: "ordered_product",
}); // Change alias to "ordered_product"

// NormalOrder.belongsTo(PaymentList, { as: "paymentmethod", foreignKey: "p_method_id" });
// PaymentList.hasMany(NormalOrder, { as: "orders", foreignKey: "p_method_id"});

// NormalOrder.belongsTo(Coupon, { as: "coupon", foreignKey: "cou_id" });
// Coupon.hasMany(NormalOrder, { as: "orders", foreignKey: "cou_id"});

// SubscribeOrder.belongsTo(Admin, { as: "admin", foreignKey: "store_id" });
// Admin.hasMany(SubscribeOrder, { as: "suborders", foreignKey: "store_id"});

// SubscribeOrder.belongsTo(Product, { as: "product", foreignKey: "product_id" });
// Product.hasMany(SubscribeOrder, { as: "suborders", foreignKey: "product_id"});

// SubscribeOrder.belongsTo(User, { as: "user", foreignKey: "uid" });
// User.hasMany(SubscribeOrder, { as: "suborders", foreignKey: "uid"});

// SubscribeOrder.belongsTo(PaymentList, { as: "paymentmethod", foreignKey: "p_method_id" });
// PaymentList.hasMany(SubscribeOrder, { as: "suborders", foreignKey: "p_method_id"});

SubscribeOrder.belongsTo(Coupon, { as: "coupon", foreignKey: "cou_id" });
Coupon.hasMany(SubscribeOrder, { as: "suborders", foreignKey: "cou_id" });

SubscribeOrder.belongsTo(Rider, { as: "subrider", foreignKey: "rid" });
Rider.hasMany(SubscribeOrder, { as: "suborders", foreignKey: "rid" });

// ProductAttribute.belongsTo(Product, {as:"products", foreignKey:"product_id"});
// Product.hasMany(ProductAttribute, {as:"attributes", foreignKey:"product_id"});

// ProductAttribute.belongsTo(Admin, {as:"store", foreignKey:"store_id"});
// Admin.hasMany(ProductAttribute, {as:"attributes", foreignKey:"store_id"});

// User.belongsTo(Store, { foreignKey: "store_id", as: "store" });
// Store.hasMany(User, { foreignKey: "store_id", as: "users" });

ProductInventory.belongsTo(Product, {
  foreignKey: "product_id",
  as: "inventoryProducts",
});
Product.hasMany(ProductInventory, {
  foreignKey: "product_id",
  as: "inventoryProducts",
});

Address.belongsTo(User, { foreignKey: "uid", as: "user" });
User.hasMany(Address, { foreignKey: "uid", as: "addresses" });

NormalOrder.belongsTo(Address, {
  foreignKey: "address_id",
  as: "instOrdAddress",
});
Address.hasMany(NormalOrder, {
  foreignKey: "address_id",
  as: "instOrdAddress",
});

SubscribeOrder.belongsTo(Address, {
  foreignKey: "address_id",
  as: "subOrdAddress",
});
Address.hasMany(SubscribeOrder, {
  foreignKey: "address_id",
  as: "subOrdAddress",
});

Favorite.belongsTo(Product, { foreignKey: "pid", as: "favproducts" });
Product.belongsTo(Favorite, { foreignKey: "pid", as: "favproducts" });

SubscribeOrder.belongsTo(User, { as: "user", foreignKey: "uid" });
User.hasMany(SubscribeOrder, { as: "suborders", foreignKey: "uid" });

ProductImage.belongsTo(Product, { foreignKey: "product_id", as: "product" });

ProductReivew.belongsTo(Product, { foreignKey: "product_id", as: "product" });
Product.hasMany(ProductReivew, {
  foreignKey: "product_id",
  as: "ProductReviews",
});

User.hasMany(ProductReivew, { foreignKey: "user_id", as: "UserReviews" });
ProductReivew.belongsTo(User, { foreignKey: "user_id", as: "UserDetails" });

Review.belongsTo(Rider, { foreignKey: "rider_id", as: "rider" });
Rider.hasMany(Review, { foreignKey: "rider_id", as: "reviews" });

Review.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Review, { foreignKey: "user_id", as: "reviews" });

NormalOrder.belongsTo(Rider, { foreignKey: "rid", as: "riders" });
Rider.hasMany(NormalOrder, { foreignKey: "rid", as: "orders" });

// SubscribeOrder.belongsTo(Time, { foreignKey: "timeslot_id", as: "timeslots" });
// Time.hasMany(SubscribeOrder, { foreignKey: "timeslot_id", as: "timeslots" });

NormalOrder.belongsTo(Time, { foreignKey: "timeslot_id", as: "timeslot" });
Time.hasMany(NormalOrder, { foreignKey: "timeslot_id", as: "timeslot" });

Review.belongsTo(NormalOrder, {
  foreignKey: "order_id",
  constraints: false,
  // scope: { order_type: "normal" },
  as: "normalorderdeliveryreview",
});
NormalOrder.hasMany(Review, {
  foreignKey: "order_id",
  constraints: false,
  as: "normalorderdeliveryreview",
});

Review.belongsTo(SubscribeOrder, {
  foreignKey: "order_id",
  constraints: false,
  scope: { order_type: "subscribe" },
  as: "suborderdeliveryreview",
});
SubscribeOrder.hasMany(Review, {
  foreignKey: "order_id",
  constraints: false,
  as: "suborderdeliveryreview",
});

const WeightOption = require("./WeightOption");

Product.hasMany(WeightOption, {
  foreignKey: "product_id",
  as: "weightOptions",
});
WeightOption.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

Cart.belongsTo(WeightOption, {
  foreignKey: "weight_id",
  as: "cartweight",
});

WeightOption.hasMany(Cart, {
  foreignKey: "weight_id",
  as: "cartweight",
});

const StoreWeightOption = require("./StoreWeightOption");
const ProductReview = require("./ProductReview");
const PersonRecord = require("./PersonRecord");
ProductInventory.hasMany(StoreWeightOption, {
  foreignKey: "product_inventory_id",
  as: "storeWeightOptions",
});

StoreWeightOption.belongsTo(ProductInventory, {
  foreignKey: "product_inventory_id",
  as: "productInventory",
});

ProductInventory.belongsTo(Product, {
  foreignKey: "product_id",
  as: "inventoryProduct",
});

Product.hasMany(ProductInventory, {
  foreignKey: "product_id",
  as: "productInventories",
});

// In StoreWeightOption model
StoreWeightOption.belongsTo(WeightOption, {
  foreignKey: "weight_id",
  as: "weightOption",
});

// In WeightOption model
WeightOption.hasMany(StoreWeightOption, {
  foreignKey: "weight_id",
  as: "storeWeightOption",
});

NormalOrderProduct.belongsTo(WeightOption, {
  foreignKey: "weight_id",
  as: "productWeight",
});

WeightOption.hasMany(NormalOrderProduct, {
  foreignKey: "weight_id",
  as: "productWeight",
});

SubscribeOrderProduct.belongsTo(WeightOption, {
  foreignKey: "weight_id",
  as: "subscribeProductWeight",
});

WeightOption.hasMany(SubscribeOrderProduct, {
  foreignKey: "weight_id",
  as: "subscribeProductWeight",
});

Favorite.belongsTo(ProductInventory, {
  foreignKey: "pid",
  as: "inventory",
});
ProductInventory.hasMany(Favorite, {
  foreignKey: "pid",
  as: "favorites",
});

SubscribeOrder.belongsTo(Store, {
  foreignKey: "store_id",
  as: "store",
});

ProductInventory.belongsTo(Store, {
  foreignKey: "store_id",
  as: "stock",
});
Store.hasMany(ProductInventory, {
  foreignKey: "store_id",
  as: "productInventories",
});

ProductReview.belongsTo(NormalOrderProduct, {
  foreignKey: "product_id",
  targetKey: "product_id",
  as: "normalOrderProduct",
});

ProductReview.belongsTo(SubscribeOrderProduct, {
  foreignKey: "product_id",
  targetKey: "product_id",
  as: "subscribeOrderProduct",
});

ProductReview.belongsTo(NormalOrder, {
  foreignKey: "order_id",
  as: "normalOrder",
  constraints: false,
});
ProductReview.belongsTo(SubscribeOrder, {
  foreignKey: "order_id",
  as: "subscribeOrder",
  constraints: false,
});

// ProductInventory.belongsTo(Category,{foreignKey:"cat"})
// StoreWeightOption.belongsTo(WeightOption, { foreignKey: "weight_id", as: "weightOptions" });
// WeightOption.hasMany(StoreWeightOption, { foreignKey: "weight_id", as: "storeWeightOptions" });

StoreWeightOptionHistory.belongsTo(ProductInventory, {
  as: "productInventorys",
  foreignKey: "product_inventory_id",
});

StoreWeightOptionHistory.belongsTo(Product, {
  as: "products",
  foreignKey: "product_id",
});

StoreWeightOptionHistory.belongsTo(WeightOption, {
  as: "weightOptions",
  foreignKey: "weight_id",
});

// Define corresponding hasMany relationships
ProductInventory.hasMany(StoreWeightOptionHistory, {
  as: "storeWeightOptionHistorie",
  foreignKey: "product_inventory_id",
});

StoreWeightOptionHistory.belongsTo(ProductInventory, {
  as: "productInventory",
  foreignKey: "product_inventory_id",
});

StoreWeightOptionHistory.belongsTo(Product, {
  as: "product",
  foreignKey: "product_id",
});

StoreWeightOptionHistory.belongsTo(WeightOption, {
  as: "weightOption",
  foreignKey: "weight_id",
});

// Define corresponding hasMany relationships
ProductInventory.hasMany(StoreWeightOptionHistory, {
  as: "storeWeightOptionHistories",
  foreignKey: "product_inventory_id",
});

Product.hasMany(StoreWeightOptionHistory, {
  as: "storeWeightOptionHistories",
  foreignKey: "product_id",
});

WeightOption.hasMany(StoreWeightOptionHistory, {
  as: "storeWeightOptionHistories",
  foreignKey: "weight_id",
});

SubscribeOrderProduct.belongsTo(Time,{as:"timeslotss",foreignKey:"timeslot_id"})
Time.hasMany(SubscribeOrderProduct,{as:"timeslotss",foreignKey:"timeslot_id"})


NormalOrder.hasOne(PersonRecord, { foreignKey: "order_id", as: "receiver" });
PersonRecord.belongsTo(NormalOrder, { foreignKey: "order_id" });