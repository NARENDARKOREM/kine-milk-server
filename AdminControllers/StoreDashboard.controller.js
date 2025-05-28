const ProductInventory = require("../Models/ProductInventory");
const Time = require("../Models/Time");
const NormalOrder = require("../Models/NormalOrder");
const SubscribeOrder = require("../Models/SubscribeOrder");
const Rider = require("../Models/Rider");
const { fn, col } = require('sequelize');

const getStoreDashboardData = async (req, res) => {
    try {
        const { store_id } = req.params; // Get store_id from request params

        if (!store_id) {
            console.error('Store ID missing in request parameters');
            return res.status(400).json({ success: false, message: "Store ID is required" });
        }

        // Fetch counts for NormalOrder by status
        const normalOrderCounts = await NormalOrder.findAll({
            where: { store_id },
            attributes: [
                'status',
                [fn('COUNT', col('id')), 'count'],
            ],
            group: ['status'],
            raw: true, // Ensure raw data for easier processing
        });

        // Fetch counts for SubscribeOrder by status
        const subscribeOrderCounts = await SubscribeOrder.findAll({
            where: { store_id },
            attributes: [
                'status',
                [fn('COUNT', col('id')), 'count'],
            ],
            group: ['status'],
            raw: true, // Ensure raw data for easier processing
        });

        // Initialize status-based counts
        const counts = {
            normalPending: 0,
            normalProcessing: 0,
            normalCompleted: 0,
            normalCancelled: 0,
            subscribePending: 0,
            subscribeProcessing: 0,
            subscribeCompleted: 0,
            subscribeCancelled: 0,
        };

        // Log raw counts for debugging
        console.log('Raw Normal Order Counts:', normalOrderCounts);
        console.log('Raw Subscribe Order Counts:', subscribeOrderCounts);

        // Map NormalOrder counts with case normalization
        normalOrderCounts.forEach((row) => {
            const status = row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase() : '';
            console.log(`Processing NormalOrder status: ${status}, count: ${row.count}`);
            if (status === 'Pending') counts.normalPending = parseInt(row.count, 10);
            if (status === 'Processing') counts.normalProcessing = parseInt(row.count, 10);
            if (status === 'Completed') counts.normalCompleted = parseInt(row.count, 10);
            if (status === 'Cancelled') counts.normalCancelled = parseInt(row.count, 10);
        });

        // Map SubscribeOrder counts with case normalization
        subscribeOrderCounts.forEach((row) => {
            const status = row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase() : '';
            console.log(`Processing SubscribeOrder status: ${status}, count: ${row.count}`);
            if (status === 'Pending') counts.subscribePending = parseInt(row.count, 10);
            if (status === 'Processing') counts.subscribeProcessing = parseInt(row.count, 10);
            if (status === 'Completed') counts.subscribeCompleted = parseInt(row.count, 10);
            if (status === 'Cancelled') counts.subscribeCancelled = parseInt(row.count, 10);
        });

        // Log mapped counts
        console.log('Mapped Counts:', counts);

        // Fetch other counts
        const [
            productInventoryCount,
            timeCount,
            riderCount,
        ] = await Promise.all([
            ProductInventory.count({ where: { store_id } }),
            Time.count({ where: { store_id } }),
            Rider.count({ where: { store_id } }),
        ]);

        // Calculate total records count for this store (optional, included for backward compatibility)
        const totalRecords = 
            productInventoryCount + 
            timeCount + 
            (counts.normalPending + counts.normalProcessing + counts.normalCompleted + counts.normalCancelled) +
            (counts.subscribePending + counts.subscribeProcessing + counts.subscribeCompleted + counts.subscribeCancelled) +
            riderCount;

        // Construct response
        const responseData = {
            success: true,
            data: {
                productInventory: productInventoryCount || 0,
                times: timeCount || 0,
                riders: riderCount || 0,
                normalPending: counts.normalPending,
                normalProcessing: counts.normalProcessing,
                normalCompleted: counts.normalCompleted,
                normalCancelled: counts.normalCancelled,
                subscribePending: counts.subscribePending,
                subscribeProcessing: counts.subscribeProcessing,
                subscribeCompleted: counts.subscribeCompleted,
                subscribeCancelled: counts.subscribeCancelled,
                totalRecords, // Optional: remove if not needed
            },
        };

        // Log final response
        console.log('Final Response Data:', JSON.stringify(responseData, null, 2));

        return res.json(responseData);
    } catch (error) {
        console.error("Error fetching store dashboard data:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { getStoreDashboardData };