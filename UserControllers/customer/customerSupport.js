const Store = require("../../Models/Store");




const customerSupport = async(req, res)=>{
    const {storeId} = req.params;
    try {
        const store = await Store.findOne({
            where:{id:storeId},
            attributes:["mobile","email"]
            
        });

        if(!store){
            return res.status(404).json({
                status: false,
                ResponseMsg: "Store not found"
                });
                
        }

        return res.status(200).json({
            status: true,
            ResponseMsg: "Customer Support",
            store
            });
    } catch (error) {
        
    }
}

module.exports ={
    customerSupport
}