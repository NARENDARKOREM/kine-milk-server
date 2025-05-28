const { where } = require("sequelize");
const Product = require("../../Models/Product");
const ProductImage = require("../../Models/productImages");
const Category = require("../../Models/Category");
const WeightOption = require("../../Models/WeightOption");
const ProductInventory = require("../../Models/ProductInventory");
const StoreWeightOption = require("../../Models/StoreWeightOption");

const productInfo = async (req, res) => {
    try {
        const {  pid } = req.body;
        
        
        if ( !pid) {
            return res.status(400).json({
                ResponseCode: "401",
                Result: "false",
                ResponseMsg: "Something Went Wrong!"
            });
        }




        const product = await ProductInventory.findAll({
            where: { id: pid },
            include: [
              { 
                model: Product, 
                as: "inventoryProducts",
                include:[{
                  
                    model: Category, 
                    as: "category",
                    attributes:["id","title"]
                  
                }]
              },
              
              {
                model: StoreWeightOption,
                as: "storeWeightOptions",
                include: [{ 
                  model: WeightOption, 
                  as: "weightOption",
                  required: false, // Important: make this left join
                  attributes: ['id', 'weight', 'normal_price', 'subscribe_price', 'mrp_price']
                }],
              },
            ],
          });



     
        if (!product) {
            return res.status(404).json({
                ResponseCode: "404",
                Result: "false",
                ResponseMsg: "Product Not Found!"
            });
        }

        return res.json({
            ResponseCode: "200",
            Result: "true",
            ResponseMsg: "Product Information Get Successfully!",
            ProductData: product
        });

    } catch (error) {
        console.error("Error fetching product information:", error);
        return res.status(500).json({
            ResponseCode: "500",
            Result: "false",
            ResponseMsg: "Internal Server Error"
        });
    }
}


module.exports = productInfo;