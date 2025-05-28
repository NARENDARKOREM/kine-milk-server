const Settings = require("../../Models/Setting");

// Get terms and conditions, privacy policy, and cancellation policy
const getPolicies = async (req, res) => {
    try {
        // Fetch the latest settings record (assuming there's only one record)
        const settings = await Settings.findOne();

        if (!settings) {
            return res.status(404).json({ message: "Settings not found" });
        }

        // Extract the required fields
        const policies = {
            terms_conditions: settings.terms_conditions,
            privacy_policy: settings.privacy_policy,
            cancellation_policy: settings.cancellation_policy,
        };

        return res.status(200).json({ message: "Policies fetched successfully", policies });
    } catch (error) {
        console.error("Error in getPolicies:", error);
        res.status(500).json({
            message: "Server error while fetching policies",
            error: error.message,
        });
    }
};

module.exports = { getPolicies };