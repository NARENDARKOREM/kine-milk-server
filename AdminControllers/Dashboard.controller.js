const Banner = require('../Models/Banner');
const Category = require('../Models/Category');
const Product = require('../Models/Product');
const ProductImages = require('../Models/productImages');
const Coupon = require('../Models/Coupon');
const Faq = require('../Models/Faq');
const Store = require('../Models/Store');
const Admin = require('../Models/Admin');
const User = require('../Models/User');
 // Ensure correct path

const getDashboardData = async (req, res) => {
    try {
        // Fetch count of records from each model in parallel
        const [
            bannerCount,
            categoryCount,
            productCount,
            productImagesCount,
            couponCount,
            faqCount,
            storeCount,
            adminCount,
            userCount
        ] = await Promise.all([
            Banner.count(),
            Category.count(),
            Product.count(),
            ProductImages.count(),
            Coupon.count(),
            Faq.count(),
            Store.count(),
            Admin.count(),
            User.count()
        ]);

        // Calculate total count of all records
        const totalRecords = 
            bannerCount + categoryCount + productCount + productImagesCount + 
            couponCount + faqCount + storeCount + adminCount + userCount;

        // Send response with counts
        return res.json({
            success: true,
            data: {
                banners: bannerCount,
                categories: categoryCount,
                products: productCount,
                productImages: productImagesCount,
                coupons: couponCount,
                faqs: faqCount,
                stores: storeCount,
                admins: adminCount,
                users: userCount,
                totalRecords // Total count of all models
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { getDashboardData };

