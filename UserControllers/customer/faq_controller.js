const Faq = require('../../Models/Faq');

const GetFAQs = async (req, res) => {
    try {
        const uid = req.user.userId;

        if (!uid) {
            return res.status(401).json({ 
                ResponseCode: "401",
                Result: "false",
                ResponseMsg: "Unauthorized: User not found!" 
            });
        }

        const faqs = await Faq.findAll();

        if (!faqs || faqs.length === 0) {
            return res.status(404).json({ 
                ResponseCode: "404",
                Result: "false",
                ResponseMsg: "No FAQs found!" 
            });
        }

        return res.status(200).json({
            ResponseCode: "200",
            Result: "true",
            ResponseMsg: "FAQs fetched successfully!",
            faqs
        });

    } catch (error) {
        console.error("Error fetching FAQs:", error.message);
        return res.status(500).json({ 
            ResponseCode: "500",
            Result: "false",
            ResponseMsg: "Internal server error: " + error.message 
        });
    }
};

module.exports = { GetFAQs };
