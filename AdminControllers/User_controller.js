const User = require("../Models/User");
const logger = require("../utils/logger"); // Ensure logger is properly imported

const getUsers = async (req, res) => {
    try {
        const users = await User.findAll();

        if (!users || users.length === 0) {
            logger.info("No users found");
            return res.status(404).json({ message: "No users found" });
        }

        logger.info("Successfully retrieved all users");
        res.status(200).json(users);
    } catch (error) {
        logger.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
const toggleusertStatus = async (req, res) => {  
    try {
        const { id, value } = req.body;
        console.log("Request receiveddddddddddddddddddd:", req.body);

        const user = await User.findByPk(id);

        if (!user) {
            console.log("User not found");
            return res.status(404).json({ message: "User not found." });
        }

        user.status = value;
        await user.save(); // Corrected save method

        console.log("User status updated successfully:", user);
        res.status(200).json({
            message: "User status updated successfully.",
            updatedStatus: user.status, // Corrected instance reference
        });
    } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

module.exports = { getUsers, toggleusertStatus};
