const asyncHandler = require("../middlewares/errorHandler");
const logger = require("../utils/logger");
const uploadToS3 = require("../config/fileUpload.aws");
const { ProductImagesByIdSchema, ProductImagesDeleteSchema, ProductImagesSearchSchema } = require("../utils/validation");
const ProductImage = require("../Models/productImages");
const Product = require("../Models/Product");
const Category = require("../Models/Category");
const { Op } = require("sequelize");

// Existing functions (unchanged)
const getAllProductImages = async (req, res, next) => {
    try {
        const photos = await ProductImage.findAll({
            include: [
                {
                    model: Product,
                    attributes: ['title'],
                    as: 'product'
                }
            ]
        });

        const formattedPhotos = photos.map(photo => {
            let parsedImages;

            try {
                parsedImages = JSON.parse(photo.img); 
                if (!Array.isArray(parsedImages)) {
                    parsedImages = [photo.img];
                }
            } catch (error) {
                parsedImages = [photo.img];
            }

            return {
                ...photo.toJSON(),
                img: parsedImages
            };
        });

        logger.info("Successfully retrieved all ProductImages");
        res.status(200).json(formattedPhotos);
    } catch (error) {
        console.error("Error fetching product images:", error);
        res.status(500).json({ error: "Failed to fetch product images" });
    }
};

const toggleProductImageStatus = asyncHandler(async (req, res) => {
    const { id, value } = req.body;
    try {
        const productImage = await ProductImage.findByPk(id);
        if (!productImage) {
            logger.error("Product Image not found!");
            return res.status(404).json({ message: "Product Image not found!" });
        }
        productImage.status = value;
        await productImage.save();
        logger.info("Product Image status updated successfully.");
        res.status(200).json({
            message: "Product Image status updated successfully.",
            updatedStatus: productImage.status,
        });
    } catch (error) {
        console.error("Error updating product Image status:", error);
        res.status(500).json({ message: "Internal server error." });    
    }
});

const upsertProductImages = async (req, res) => {
     const { id, product_id, status, existing_images } = req.body;

     try {
       if (!product_id) {
         return res.status(400).json({ error: "Product ID is required." });
       }

       const product = await Product.findByPk(product_id);
       if (!product) {
         return res.status(400).json({ error: "Invalid product ID." });
       }

       const files = req.file;
       console.log(files,"fffffffffffffffffiles")
       const imgFiles = files?.img ? (Array.isArray(files.img) ? files.img : [files.img]) : [];

       let product_imgUrls = [];
       if (imgFiles.length > 0) {
         product_imgUrls = await uploadToS3(imgFiles, "Product-Images");
         if (!Array.isArray(product_imgUrls)) {
           product_imgUrls = [product_imgUrls];
         }
       }

       let existingImageUrls = [];
       if (existing_images) {
         try {
           existingImageUrls = JSON.parse(existing_images);
           if (!Array.isArray(existingImageUrls)) {
             existingImageUrls = [existingImageUrls];
           }
         } catch (e) {
           console.error("Error parsing existing_images:", e);
           return res.status(400).json({ error: "Invalid existing_images format." });
         }
       }

       if (id) {
         const existingProductImage = await ProductImage.findByPk(id);
         if (!existingProductImage) {
           return res.status(404).json({ error: "Product image not found" });
         }

         let currentImages = [];
         if (existingProductImage.img) {
           try {
             currentImages = JSON.parse(existingProductImage.img);
             if (!Array.isArray(currentImages)) {
               currentImages = [currentImages];
             }
           } catch (e) {
             console.error("Error parsing current images:", e);
             currentImages = [];
           }
         }

         const updatedImages = [...existingImageUrls, ...product_imgUrls];
         const uniqueImages = [...new Set(updatedImages)];

         if (uniqueImages.length === 0 && currentImages.length === 0) {
           return res.status(400).json({ error: "At least one image is required." });
         }

         existingProductImage.product_id = product_id;
         existingProductImage.status = status;
         existingProductImage.img = uniqueImages.length > 0 ? JSON.stringify(uniqueImages) : existingProductImage.img;
         await existingProductImage.save();

         return res.status(200).json({
           message: product_imgUrls.length > 0 ? "Extra images added successfully!" : "Product image updated successfully!",
           productImage: existingProductImage,
         });
       } else {
         if (product_imgUrls.length === 0) {
           return res.status(400).json({ error: "At least one image is required." });
         }

         const newProductImage = await ProductImage.create({
           product_id,
           status,
           img: JSON.stringify(product_imgUrls),
         });

         return res.status(201).json({
           message: "Product image created successfully!",
           productImage: newProductImage,
         });
       }
     } catch (error) {
       console.error("Error in upsertProductImages:", error);
       return res.status(500).json({ error: "Internal server error", details: error.message });
     }
   };

const getProductImagesCount = asyncHandler(async (req, res) => {
    const productImagesCount = await ProductImage.count();
    const productImages = await ProductImage.findAll();
    logger.info("ProductImages count retrieved", productImagesCount);
    res.status(200).json({ productImages, count: productImagesCount });
});

const getProductImagesById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const productImage = await ProductImage.findOne({
        where: { id },
        include: [
            {
                model: Product,
                as: "product",
                attributes: ["id", "title"],
                include: [
                    {
                        model: Category,
                        as: "category",
                        attributes: ["id", "title"],
                    },
                ],
            },
        ],
    });

    if (!productImage) {
        logger.error("ProductImage not found");
        return res.status(404).json({ error: "ProductImage not found" });
    }

    // Parse the img field
    let parsedImages = [];
    try {
        parsedImages = JSON.parse(productImage.img);
        if (!Array.isArray(parsedImages)) {
            parsedImages = [productImage.img];
        }
    } catch (error) {
        parsedImages = [productImage.img];
    }

    const response = {
        id: productImage.id,
        product_id: productImage.product_id,
        product_title: productImage.product?.title || "",
        category_id: productImage.product?.category?.id || "",
        category_title: productImage.product?.category?.title || "",
        img: parsedImages,
        status: productImage.status,
    };

    logger.info("ProductImage found");
    res.status(200).json(response);
});

const deleteProductImages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { forceDelete } = req.body;

    const productImage = await ProductImage.findOne({ where: { id }, paranoid: false });

    if (!productImage) {
        logger.error("ProductImage not found");
        return res.status(404).json({ error: "ProductImage not found" });
    }

    if (productImage.deletedAt && forceDelete !== "true") {
        logger.error("ProductImage is already soft-deleted");
        return res.status(400).json({
            error: "ProductImage is already soft-deleted. Use forceDelete=true to permanently delete it.",
        });
    }

    if (forceDelete === "true") {
        await productImage.destroy({ force: true });
        logger.info("ProductImage permanently deleted");
        return res.status(200).json({ message: "ProductImage permanently deleted successfully" });
    }

    await productImage.destroy();
    logger.info("ProductImage soft-deleted");
    return res.status(200).json({ message: "ProductImage soft deleted successfully" });
});

const searchProductImages = asyncHandler(async (req, res) => {
    const { error } = ProductImagesSearchSchema.validate(req.body);
    if (error) {
        logger.error(error.details[0].message);
        return res.status(400).json({ error: error.details[0].message });
    }

    const { id, title } = req.body;
    const whereClause = {};
    if (id) {
        whereClause.id = id;
    }

    if (title && title.trim() !== "") {
        whereClause.title = { [Op.like]: `%${title.trim()}%` };
    }

    const productImages = await ProductImage.findAll({ where: whereClause });

    if (productImages.length === 0) {
        logger.error("No matching product images found");
        return res.status(404).json({ error: "No matching product images found" });
    }

    logger.info("ProductImages found");
    res.status(200).json(productImages);
});

module.exports = {
    getAllProductImages,
    toggleProductImageStatus,
    getProductImagesCount,
    getProductImagesById,
    deleteProductImages,
    searchProductImages,
    upsertProductImages,
};