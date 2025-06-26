
const User = require("../../Models/User");
const Banner = require("../../Models/Banner");
const Category = require("../../Models/Category");
const Product = require("../../Models/Product");
const Store = require("../../Models/Store");
const ProductInventory = require("../../Models/ProductInventory");
const Notification = require("../../Models/Notification");
const { Op, Sequelize } = require("sequelize");
const StoreWeightOption = require("../../Models/StoreWeightOption");
const WeightOption = require("../../Models/WeightOption");
const ProductImage = require("../../Models/productImages");
const Ads = require("../../Models/Ads");
const Coupon = require("../../Models/Coupon");


const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const homeAPI = async (req, res) => {
  const { pincode } = req.params;
  const { latitude, longitude } = req.body;

  console.log("Request Params:", { pincode });
  console.log("Request Body:", { latitude, longitude });

  // Require both pincode and latitude/longitude
  if (!pincode || !latitude || !longitude) {
    return res.json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Pincode, latitude, and longitude are all required!",
    });
  }

  try {
    // Fetch banners and categories (unchanged)
    const banners = await Banner.findAll({
      where: { status: 1 },
      attributes: ["id", "img"],
    });

    const categories = await Category.findAll({
      where: { status: 1 },
      attributes: ["id", "title", "img"],
    });

    let stores = [];
    let fetchMethod = ""; // To track how stores were fetched

    // Step 1: Try fetching stores by pincode
    stores = await Store.findAll({
      where: {
        status: 1,
        pincode: pincode, // Match exact pincode
      },
      attributes: ["id", "title", "rimg", "full_address", "lats", "longs"],
    });
    console.log(`Stores found for pincode ${pincode}:`, stores.length);

    if (stores.length > 0) {
      fetchMethod = "pincode";
      console.log(`Stores fetched successfully using pincode: ${pincode}`);
    } else {
      // Step 2: Fallback to radius search using latitude/longitude
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);
      console.log("No stores found for pincode. Falling back to radius search:", { userLat, userLon });

      const allStores = await Store.findAll({
        where: { status: 1 },
        attributes: ["id", "title", "rimg", "full_address", "lats", "longs"],
      });
      console.log("Total active stores fetched:", allStores.length);

      stores = allStores.filter((store) => {
        const storeLat = parseFloat(store.lats);
        const storeLon = parseFloat(store.longs);
        if (!storeLat || !storeLon) {
          console.log(`Store ${store.title} skipped: Invalid lat/lon (${store.lats}, ${store.longs})`);
          return false;
        }
        const distance = getDistance(userLat, userLon, storeLat, storeLon);
        console.log(`Store: ${store.title}, Lat: ${storeLat}, Lon: ${storeLon}, Distance: ${distance}km`);
        return distance <= 10; // 10km radius
      });

      if (stores.length > 0) {
        fetchMethod = "latitude/longitude";
        console.log(`Stores fetched successfully using latitude/longitude: ${latitude}, ${longitude}`);
      }
    }

    if (stores.length === 0) {
      console.log("No stores found by either pincode or latitude/longitude.");
      return res.json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "No stores found for your pincode or within 10km of your location!",
      });
    }

    // Fetch product inventory for the found stores
    const productInventory = await ProductInventory.findAll({
      where: {
        status: 1,
        store_id: { [Op.in]: stores.map((store) => store.id) },
      },
      attributes: ["id", "product_id"],
      include: [
        {
          model: Product,
          as: "inventoryProducts",
          attributes: ["id", "cat_id", "title", "img", "description"],
          include: [
            {
              model: ProductImage,
              as: "extraImages",
              attributes: ["id", "product_id", "img"],
            },
            {
              model: Category,
              as: "category",
              attributes: ["id", "title"],
            },
          ],
        },
        {
          model: StoreWeightOption,
          as: "storeWeightOptions",
          include: [
            {
              model: WeightOption,
              as: "weightOption",
              required: false,
              attributes: ["id", "weight", "normal_price", "subscribe_price", "mrp_price"],
            },
          ],
        },
      ],
    });

    if (!productInventory || productInventory.length === 0) {
      console.log("No products available in the fetched stores.");
      return res.json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "No products available in the stores.",
      });
    }

    // Check for out-of-stock products
    const outOfStockProducts = productInventory.filter((item) => item?.quantity === 0);
    if (outOfStockProducts.length > 0) {
      console.log("Some products are out of stock:", outOfStockProducts.length);
      return res.json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Some products are out of stock.",
        OutOfStockProducts: outOfStockProducts.map((p) => ({
          product_id: p.product_id,
          title: p.inventoryProducts.title,
        })),
      });
    }

    // Group products by category
    const categoryProducts = [];
    for (const category of categories) {
      const productsInCategory = productInventory.filter(
        (productItem) => productItem.inventoryProducts?.cat_id === category?.id
      );
      if (productsInCategory.length > 0) {
        categoryProducts.push({
          name: category?.title,
          items: productsInCategory,
        });
      }
    }

    console.log("Home data prepared successfully.");
    return res.json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Home Data Fetched Successfully!",
      HomeData: {
        store: stores[0], // First store (adjust if all stores needed)
        Banlist: banners,
        Catlist: categories,
        CategoryProducts: categoryProducts,
        currency: "INR",
      },
    });
  } catch (error) {
    console.error("Error fetching home data:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
      error: error.message,
    });
  }
};

const HomeScreenAPI = async(req,res)=>{
  console.log("Processing HomeScreenAPI request...");

  try {
    const planTypes = await Banner.findAll({where:{status:1,}});
    if(!planTypes || planTypes.length === 0){
      return res.status(401).json({
        ResponseMsg:"400",
        Result:"false",
        ResponseMsg:"Plan types are not found"
      })
    }
    const ads = await Ads.findAll({where:{status:1,screenName:"homescreen"}})
    if(!ads || ads.length === 0){
      return res.status(401).json({
        ResponseMsg:"400",
        Result:"false",
        ResponseMsg:"Ads are not found"
      })
    }
    const offers = await Ads.findAll({where:{status:1,screenName:"categories",planType:{[Op.in]:['instant','subscribe']}}},);
    if(!offers || offers.length === 0){
      return res.status(401).json({
        ResponseMsg:"400",
        Result:"false",
        ResponseMsg:"Offers are not found"
      })
    }
    return res.status(200).json({
      ResponseMsg:"200",
        Result:"true",
        ResponseMsg:"Plan types are fetched successfully.",
        planTypes,
        ads,
        offers,
    })
  } catch (error) {
    console.error("Error fetching plan types:",error)
    return res.status(500).json({
        ResponseMsg:"500",
        Result:"false",
        ResponseMsg:"Internal server error",
    })
  }
}

const homeCategoriesAPI = async (req, res) => {
  const { pincode } = req.params;
  const { latitude, longitude } = req.body;

  console.log("Request Params:", { pincode });
  console.log("Request Body:", { latitude, longitude });

  // Require both pincode and latitude/longitude
  if (!pincode || !latitude || !longitude) {
    return res.json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Pincode, latitude, and longitude are all required!",
    });
  }

  try {

    const ads = await Ads.findAll({where:{status:1,screenName:"categories"}})

    let stores = [];
    let fetchMethod = ""; // To track how stores were fetched

    // Step 1: Try fetching stores by pincode
    stores = await Store.findAll({
      where: {
        status: 1,
        pincode: pincode, // Match exact pincode
      },
      attributes: ["id", "title", "rimg", "full_address", "lats", "longs"],
    });
    console.log(`Stores found for pincode ${pincode}:`, stores.length);

    if (stores.length > 0) {
      fetchMethod = "pincode";
      console.log(`Stores fetched successfully using pincode: ${pincode}`);
    } else {
      // Step 2: Fallback to radius search using latitude/longitude
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);
      console.log("No stores found for pincode. Falling back to radius search:", { userLat, userLon });

      const allStores = await Store.findAll({
        where: { status: 1 },
        attributes: ["id", "title", "rimg", "full_address", "lats", "longs"],
      });
      console.log("Total active stores fetched:", allStores.length);

      stores = allStores.filter((store) => {
        const storeLat = parseFloat(store.lats);
        const storeLon = parseFloat(store.longs);
        if (!storeLat || !storeLon) {
          console.log(`Store ${store.title} skipped: Invalid lat/lon (${store.lats}, ${store.longs})`);
          return false;
        }
        const distance = getDistance(userLat, userLon, storeLat, storeLon);
        console.log(`Store: ${store.title}, Lat: ${storeLat}, Lon: ${storeLon}, Distance: ${distance}km`);
        return distance <= 10; // 10km radius
      });

      if (stores.length > 0) {
        fetchMethod = "latitude/longitude";
        console.log(`Stores fetched successfully using latitude/longitude: ${latitude}, ${longitude}`);
      }
    }

    if (stores.length === 0) {
      console.log("No stores found by either pincode or latitude/longitude.");
      return res.json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "No stores found for your pincode or within 10km of your location!",
      });
    }

    // Fetch categories via product inventory
    const productInventory = await ProductInventory.findAll({
      where: {
        status: 1,
        store_id: { [Op.in]: stores.map((store) => store.id) },
      },
      attributes: [],
      include: [
        {
          model: Product,
          as: "inventoryProducts",
          attributes: [],
          required: true,
          include: [
            {
              model: Category,
              as: "category",
              attributes: ["id", "title", "img"],
              where: { status: 1 },
            },
          ],
        },
      ],
      group: ["inventoryProducts.category.id"], // Group by category to get distinct categories
      raw: true, // Use raw query to simplify output
      logging: console.log, // Log SQL for debugging
    });

    // Extract unique categories from productInventory
    const categories = productInventory.map((item) => ({
      id: item["inventoryProducts.category.id"],
      title: item["inventoryProducts.category.title"],
      img: item["inventoryProducts.category.img"],
    })).filter(
      (category, index, self) =>
        index === self.findIndex((c) => c.id === category.id)
    ); // Remove duplicates

    if (!categories || categories.length === 0) {
      console.log("No categories with active products found in the fetched stores.");
      return res.json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "No categories with available products found in the stores.",
      });
    }

    console.log("Categories data prepared successfully.");
    return res.json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Categories Data Fetched Successfully!",
      CategoriesData: {
        store: stores[0], // First store (adjust if all stores needed)
        Catlist: categories,
        Ads:ads,
        currency: "INR",
      },
    });
  } catch (error) {
    console.error("Error fetching categories data:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
      error: error.message,
    });
  }
};

const homeProductsAPI = async (req, res) => {
  const { pincode } = req.params;
  const { latitude, longitude, categoryId } = req.body;

  console.log("Request Params:", { pincode });
  console.log("Request Body:", { latitude, longitude, categoryId });

  // Require pincode, latitude, and longitude
  if (!pincode || !latitude || !longitude) {
    return res.json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Pincode, latitude, and longitude are required!",
    });
  }

  try {
    const ads = await Ads.findAll({ where: { status: 1, screenName: "categories" } });

    let category = null;
    let categoryName = "All Products"; // Default for no categoryId

    // Validate category if categoryId is provided
    if (categoryId) {
      category = await Category.findOne({
        where: { id: categoryId, status: 1 },
        attributes: ["id", "title", "img"],
      });

      if (!category) {
        console.log(`Category with ID ${categoryId} not found or inactive.`);
        return res.json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: `Category with ID ${categoryId} not found or inactive!`,
        });
      }
      categoryName = category.title;
    }

    let stores = [];
    let fetchMethod = ""; // To track how stores were fetched

    // Step 1: Try fetching stores by pincode
    stores = await Store.findAll({
      where: {
        status: 1,
        pincode: pincode, // Match exact pincode
      },
      attributes: ["id", "title", "rimg", "full_address", "lats", "longs"],
    });
    console.log(`Stores found for pincode ${pincode}:`, stores.length);

    if (stores.length > 0) {
      fetchMethod = "pincode";
      console.log(`Stores fetched successfully using pincode: ${pincode}`);
    } else {
      // Step 2: Fallback to radius search using latitude/longitude
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);
      console.log("No stores found for pincode. Falling back to radius search:", { userLat, userLon });

      const allStores = await Store.findAll({
        where: { status: 1 },
        attributes: ["id", "title", "rimg", "full_address", "lats", "longs"],
      });
      console.log("Total active stores fetched:", allStores.length);

      stores = allStores.filter((store) => {
        const storeLat = parseFloat(store.lats);
        const storeLon = parseFloat(store.longs);
        if (!storeLat || !storeLon) {
          console.log(`Store ${store.title} skipped: Invalid lat/lon (${store.lats}, ${store.longs})`);
          return false;
        }
        const distance = getDistance(userLat, userLon, storeLat, storeLon);
        console.log(`Store: ${store.title}, Lat: ${storeLat}, Lon: ${storeLon}, Distance: ${distance}km`);
        return distance <= 10; // 10km radius
      });

      if (stores.length > 0) {
        fetchMethod = "latitude/longitude";
        console.log(`Stores fetched successfully using latitude/longitude: ${latitude}, ${longitude}`);
      }
    }

    if (stores.length === 0) {
      console.log("No stores found by either pincode or latitude/longitude.");
      return res.json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "No stores found for your pincode or within 10km of your location!",
      });
    }

    // Fetch product inventory for the found stores
    const productInventoryQuery = {
      where: {
        status: 1,
        store_id: { [Op.in]: stores.map((store) => store.id) },
      },
      attributes: ["id", "product_id"],
      include: [
        {
          model: Product,
          as: "inventoryProducts",
          attributes: ["id", "cat_id", "title", "img", "description","discount"],
          where: categoryId ? { cat_id: categoryId } : {}, // Conditional category filter
          include: [
            {
              model: ProductImage,
              as: "extraImages",
              attributes: ["id", "product_id", "img"],
            },
            {
              model: Category,
              as: "category",
              attributes: ["id", "title"],
            },
          ],
        },
        {
          model: StoreWeightOption,
          as: "storeWeightOptions",
          include: [
            {
              model: WeightOption,
              as: "weightOption",
              required: false,
              attributes: ["id", "weight", "normal_price", "subscribe_price", "mrp_price"],
            },
          ],
        },
      ],
      logging: console.log, // Log SQL for debugging
    };

    const productInventory = await ProductInventory.findAll(productInventoryQuery);

    if (!productInventory || productInventory.length === 0) {
      console.log(`No products available${categoryId ? ` for category ID ${categoryId}` : ""} in the fetched stores.`);
      return res.json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: `No products available${categoryId ? ` for category ID ${categoryId}` : ""} in the stores.`,
      });
    }

    // Transform productInventory to parse extraImages.img
    const transformedInventory = productInventory.map((item) => {
      const inventoryData = item.toJSON();
      if (
        inventoryData.inventoryProducts &&
        inventoryData.inventoryProducts.extraImages &&
        inventoryData.inventoryProducts.extraImages.length > 0
      ) {
        inventoryData.inventoryProducts.extraImages = inventoryData.inventoryProducts.extraImages.map((image) => {
          try {
            // Log raw img data for debugging
            console.log(`Raw extraImages.img for product ${inventoryData.product_id}:`, image.img);
            // Parse img if it's a stringified JSON array
            const parsedImg = typeof image.img === "string" ? JSON.parse(image.img) : image.img;
            // Ensure parsedImg is an array
            return {
              ...image,
              img: Array.isArray(parsedImg) ? parsedImg : [parsedImg],
            };
          } catch (parseError) {
            console.error(`Error parsing extraImages.img for product ${inventoryData.product_id}:`, parseError);
            return { ...image, img: [] }; // Fallback to empty array on error
          }
        });
      }
      return inventoryData;
    });

    // Structure products for the response
    const categoryProducts = [
      {
        name: categoryName,
        items: transformedInventory,
      },
    ];

    console.log("Products data prepared successfully.");
    return res.json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Products Data Fetched Successfully!",
      HomeData: {
        Ads:ads,
        store: stores[0], // First store
        Catlist: category ? [category] : [], // Category if provided, else empty
        CategoryProducts: categoryProducts,
        currency: "INR",
      },
    });
  } catch (error) {
    console.error("Error fetching products data:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
      error: error.message,
    });
  }
};


const getDiscountOfferProducts = async (req, res) => {
  const { pincode } = req.params;
  const { latitude, longitude,discount } = req.body;

  console.log('Request:', { pincode, latitude, longitude,discount });

// const getDiscountOfferProducts = async (req, res) => {
//   const { pincode } = req.params;
//   const { latitude, longitude } = req.body;

//   console.log('Request:', { pincode, latitude, longitude });

//   // Validate required fields
//   if (!pincode || !latitude || !longitude) {
//     return res.status(400).json({
//       ResponseCode: '400',
//       Result: 'false',
//       ResponseMsg: 'Pincode, latitude, and longitude are required!',
//     });
//   }

//   try {
//     // Fetch active ads with valid couponPercentage
//     const offers = await Ads.findAll({
//       where: {
//         status: 1,
//         screenName: 'categories',
//         planType:{ [Op.in]: ['instant', 'subscribe'] },
//         couponPercentage: { [Op.ne]: null, [Op.gt]: 0 },
//       },
//       attributes: ['id', 'img', 'couponPercentage', 'planType'],
//     });

//     if (!offers || offers.length === 0) {
//       console.log('No active offers found.');
//       return res.status(404).json({
//         ResponseCode: '404',
//         Result: 'false',
//         ResponseMsg: 'No valid offers found with a discount percentage.',
//       });
//     }

//     const couponPercentages = [...new Set(offers.map(o => o.couponPercentage))];
//     console.log('Ad coupon percentages:', couponPercentages);

//     // Fetch active coupons matching couponPercentages
//     const currentDate = new Date();
//     const coupons = await Coupon.findAll({
//       where: {
//         coupon_val: { [Op.in]: couponPercentages },
//         status: 1,
//         end_date: { [Op.gt]: currentDate },
//       },
//       attributes: [
//         'id',
//         'coupon_code',
//         'coupon_title',
//         'coupon_val',
//         'min_amt',
//         'description',
//         'start_date',
//         'end_date',
//         'coupon_img',
//         'subtitle',
//       ],
//     });

//     if (!coupons || coupons.length === 0) {
//       console.log('No active coupons match ad coupon percentages.');
//       return res.status(404).json({
//         ResponseCode: '404',
//         Result: 'false',
//         ResponseMsg: 'No active coupons found matching offer discount percentages.',
//       });
//     }

//     const validDiscounts = [...new Set(coupons.map(c => parseFloat(c.coupon_val)))].filter(val =>
//       couponPercentages.includes(val)
//     );
//     console.log('Valid discounts (matching Ads and Coupons):', validDiscounts);

//     if (validDiscounts.length === 0) {
//       console.log('No discounts match both Ads and Coupons.');
//       return res.status(404).json({
//         ResponseCode: '404',
//         Result: 'false',
//         ResponseMsg: 'No discounts found matching both offers and coupons.',
//       });
//     }

//     // Fetch stores by pincode
//     let stores = await Store.findAll({
//       where: { status: 1, pincode },
//       attributes: ['id', 'title', 'rimg', 'full_address', 'lats', 'longs'],
//     });
//     let fetchMethod = stores.length > 0 ? 'pincode' : '';

//     if (stores.length === 0) {
//       // Fallback to radius search
//       console.log('No stores for pincode, using radius search.');
//       const allStores = await Store.findAll({
//         where: { status: 1 },
//         attributes: ['id', 'title', 'rimg', 'full_address', 'lats', 'longs'],
//       });
//       stores = allStores.filter(s => {
//         const storeLat = parseFloat(s.lats);
//         const storeLon = parseFloat(s.longs);
//         if (!storeLat || !storeLon) {
//           console.log(`Store ${s.title} skipped: Invalid lat/lon (${s.lats}, ${s.longs})`);
//           return false;
//         }
//         const distance = getDistance(parseFloat(latitude), parseFloat(longitude), storeLat, storeLon);
//         console.log(`Store: ${s.title}, Distance: ${distance}km`);
//         return distance <= 10; // 10km radius
//       });
//       fetchMethod = stores.length > 0 ? 'latitude/longitude' : '';
//     }

//     if (stores.length === 0) {
//       console.log('No stores found.');
//       return res.status(400).json({
//         ResponseCode: '400',
//         Result: 'false',
//         ResponseMsg: 'No stores found for your pincode or within 10km!',
//       });
//     }

//     // Fetch product inventory
//     const productInventory = await ProductInventory.findAll({
//       where: {
//         status: 1,
//         store_id: { [Op.in]: stores.map(s => s.id) },
//       },
//       attributes: ['id', 'product_id'],
//       include: [
//         {
//           model: Product,
//           as: 'inventoryProducts',
//           attributes: ['id', 'cat_id', 'title', 'img', 'description', 'discount'],
//           where: { discount: { [Op.in]: validDiscounts } },
//           include: [
//             {
//               model: ProductImage,
//               as: 'extraImages',
//               attributes: ['id', 'product_id', 'img'],
//             },
//             {
//               model: Category,
//               as: 'category',
//               attributes: ['id', 'title'],
//             },
//           ],
//         },
//         {
//           model: StoreWeightOption,
//           as: 'storeWeightOptions',
//           include: [
//             {
//               model: WeightOption,
//               as: 'weightOption',
//               required: false,
//               attributes: ['id', 'weight', 'normal_price', 'subscribe_price', 'mrp_price'],
//             },
//           ],
//         },
//       ],
//       logging: console.log,
//     });

//     if (!productInventory || productInventory.length === 0) {
//       console.log('No matching discounted products.');
//       return res.status(400).json({
//         ResponseCode: '400',
//         Result: 'false',
//         ResponseMsg: 'No products found with discounts matching offers and coupons.',
//       });
//     }

//     // Transform inventory to parse extraImages.img and include coupon
//     const transformedInventory = productInventory.map(item => {
//       const inventoryData = item.toJSON();
//       // Parse extraImages.img
//       if (
//         inventoryData.inventoryProducts &&
//         inventoryData.inventoryProducts.extraImages &&
//         inventoryData.inventoryProducts.extraImages.length > 0
//       ) {
//         inventoryData.inventoryProducts.extraImages = inventoryData.inventoryProducts.extraImages.map(image => {
//           try {
//             console.log(`Raw img for product ${inventoryData.product_id}:`, image.img);
//             const parsedImg = typeof image.img === 'string' ? JSON.parse(image.img) : image.img;
//             return {
//               ...image,
//               img: Array.isArray(parsedImg) ? parsedImg : [parsedImg],
//             };
//           } catch (e) {
//             console.error(`Error parsing img for product ${inventoryData.product_id}:`, e);
//             return { ...image, img: [] };
//           }
//         });
//       }
//       // Add matching coupon
//       const productDiscount = inventoryData.inventoryProducts?.discount;
//       const matchingCoupon = coupons.find(c => parseFloat(c.coupon_val) === parseFloat(productDiscount)) || null;
//       inventoryData.coupon = matchingCoupon
//         ? {
//             id: matchingCoupon.id,
//             coupon_code: matchingCoupon.coupon_code,
//             coupon_title: matchingCoupon.coupon_title,
//             coupon_val: parseFloat(matchingCoupon.coupon_val),
//             min_amt: parseFloat(matchingCoupon.min_amt),
//             description: matchingCoupon.description,
//             start_date: matchingCoupon.start_date,
//             end_date: matchingCoupon.end_date,
//             coupon_img: matchingCoupon.coupon_img,
//             subtitle: matchingCoupon.subtitle,
//           }
//         : null;
//       return inventoryData;
//     });

//     // Structure response
//     const categoryProducts = [
//       {
//         name: 'Discounted Products',
//         items: transformedInventory,
//       },
//     ];

//     console.log('Discounted products fetched successfully.');
//     return res.status(200).json({
//       ResponseCode: '200',
//       Result: 'true',
//       ResponseMsg: 'Discounted Products Data Fetched Successfully!',
//       HomeData: {
//         Ads: offers,
//         store: stores[0], // First store
//         CategoryProducts: categoryProducts,
//         Coupons: coupons.map(c => ({
//           id: c.id,
//           coupon_code: c.coupon_code,
//           coupon_title: c.coupon_title,
//           coupon_val: parseFloat(c.coupon_val),
//           min_amt: parseFloat(c.min_amt),
//           description: c.description,
//           start_date: c.start_date,
//           end_date: c.end_date,
//           coupon_img: c.coupon_img,
//           subtitle: c.subtitle,
//         })),
//         currency: 'INR',
//       },
//     });
//   } catch (error) {
//     console.error('Error fetching discount products:', error);
//     return res.status(500).json({
//       ResponseCode: '500',
//       Result: 'false',
//       ResponseMsg: 'Internal Server Error',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined,
//     });
//   }
// };

}

const getOfferProducts = async (req, res) => {
  const { banner_percentage, store_id } = req.body;

  try {
    const productInventories = await ProductInventory.findAll({
      where: {
        store_id,
        
        "$inventoryProducts.discount$": banner_percentage
      },
      attributes: ['id', 'img', 'couponPercentage', 'planType'],
    });

    if (!offers || offers.length === 0) {
      console.log('No active offers found.');
      return res.status(404).json({
        ResponseCode: '404',
        Result: 'false',
        ResponseMsg: 'No valid offers found with a discount percentage.',
      });
    }
    console.log(offers,"offerrrrrrr")

    const couponPercentages = [...new Set(offers.map(o => o.couponPercentage))];
    console.log('Coupon Percentages (with typeof):', couponPercentages.map(p => ({ val: p, type: typeof p })));

    console.log('Ad coupon percentages:', couponPercentages);

    // Fetch active coupons matching couponPercentages
    const currentDate = new Date();
    const coupons = await Coupon.findAll({
      where: {
        coupon_val: { [Op.in]: couponPercentages },
        status: 1,
        end_date: { [Op.gt]: currentDate },
      },
      attributes: [
        'id',
        'coupon_code',
        'coupon_title',
        'coupon_val',
        'min_amt',
        'description',
        'start_date',
        'end_date',
        'coupon_img',
        'subtitle',
      ],
    });
    console.log(coupons,"vvvvvvvvvvvvvvvvvv")
    if (!coupons || coupons.length === 0) {
      console.log('No active coupons match ad coupon percentages.');
      return res.status(404).json({
        ResponseCode: '404',
        Result: 'false',
        ResponseMsg: 'No active coupons found matching offer discount percentages.',
      });
    }

    const validDiscounts = [...new Set(coupons.map(c => parseFloat(c.coupon_val)))].filter(val =>
      couponPercentages.includes(val)
    );
    console.log('Valid discounts (matching Ads and Coupons):', validDiscounts);

    if (validDiscounts.length === 0) {
      console.log('No discounts match both Ads and Coupons.');
      return res.status(404).json({
        ResponseCode: '404',
        Result: 'false',
        ResponseMsg: 'No discounts found matching both offers and coupons.',
      });
    }

    // Fetch stores by pincode
    let stores = await Store.findAll({
      where: { status: 1, pincode },
      attributes: ['id', 'title', 'rimg', 'full_address', 'lats', 'longs'],
    });
    let fetchMethod = stores.length > 0 ? 'pincode' : '';

    if (stores.length === 0) {
      // Fallback to radius search
      console.log('No stores for pincode, using radius search.');
      const allStores = await Store.findAll({
        where: { status: 1 },
        attributes: ['id', 'title', 'rimg', 'full_address', 'lats', 'longs'],
      });
      stores = allStores.filter(s => {
        const storeLat = parseFloat(s.lats);
        const storeLon = parseFloat(s.longs);
        if (!storeLat || !storeLon) {
          console.log(`Store ${s.title} skipped: Invalid lat/lon (${s.lats}, ${s.longs})`);
          return false;
        }
        const distance = getDistance(parseFloat(latitude), parseFloat(longitude), storeLat, storeLon);
        console.log(`Store: ${s.title}, Distance: ${distance}km`);
        return distance <= 10; // 10km radius
      });
      fetchMethod = stores.length > 0 ? 'latitude/longitude' : '';
    }

    if (stores.length === 0) {
      console.log('No stores found.');
      return res.status(400).json({
        ResponseCode: '400',
        Result: 'false',
        ResponseMsg: 'No stores found for your pincode or within 10km!',
      });
    }

    let parsedDiscounts;
if (Array.isArray(discount)) {
  parsedDiscounts = discount.map(d => parseFloat(d)).filter(d => !isNaN(d));
} else {
  parsedDiscounts = [parseFloat(discount)].filter(d => !isNaN(d));
}
console.log('Parsed discounts:', parsedDiscounts);


    // Fetch product inventory
    const productInventory = await ProductInventory.findAll({
      where: {
        status: 1,
        store_id: { [Op.in]: stores.map(s => s.id) },
      },
      attributes: ['id', 'product_id'],
      include: [
        {
          model: Product,
          as: 'inventoryProducts',
          attributes: ['id', 'cat_id', 'title', 'img', 'description', 'discount'],
          where: { discount: { [Op.in]: parsedDiscounts } },
          include: [
            {
              model: ProductImage,
              as: "extraImages",
              attributes: ["id", "product_id", "img"],
            },
            {
              model: Category,
              as: "category",
              attributes: ["id", "title"],
            },
          ],
        },
        {
          model: StoreWeightOption,
          as: "storeWeightOptions",
          include: [
            {
              model: WeightOption,
              as: "weightOption",
              required: false,
              attributes: ["id", "weight", "normal_price", "subscribe_price", "mrp_price"],
            },
          ],
        },
      ],
    });

    const ads = await Ads.findAll({ where: { status: 1, screenName: "categories" } });

    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: `${banner_percentage}% Discounted Products fetched successfully`,
      data: productInventories,
      adds:ads
    });
  } catch (error) {
    console.error("Error in getOfferProducts:", error);
    return res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Something went wrong",
    });
  }
};


module.exports = {homeAPI,HomeScreenAPI,homeCategoriesAPI,homeProductsAPI,getOfferProducts};
