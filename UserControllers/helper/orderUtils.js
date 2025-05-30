// helpers/orderUtils.js

const  SubscribeOrder  = require("../../Models/SubscribeOrder");
const { Op } = require("sequelize");

const generateOrderId = async (transaction) => {
  let isUnique = false;
  let orderId = null;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    orderId = `${randomNum}`;

    const existingOrder = await SubscribeOrder.findOne({
      where: { order_id: orderId },
      transaction,
    });

    if (!existingOrder) isUnique = true;
    attempts++;
  }

  if (!isUnique) {
    throw new Error("Failed to generate a unique order ID after multiple attempts.");
  }

  return orderId;
};

const calculateDeliveryDays2 = (startDate, endDate, days) => {
  if (!days || days.length === 0) return 0;

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start);
  end.setHours(23, 59, 59, 999);

  if (isNaN(start) || isNaN(end) || end < start) return 0;

  let deliveryDays = 0;
  const validDays = days.map((d) =>
    typeof d === "number"
      ? ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][d]
      : d.toLowerCase()
  );

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const currentDate = new Date(d);
    const dayName = currentDate.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
    if (validDays.includes(dayName)) {
      deliveryDays++;
    }
  }

  return deliveryDays;
};

module.exports = {
  generateOrderId,
  calculateDeliveryDays2,
};
