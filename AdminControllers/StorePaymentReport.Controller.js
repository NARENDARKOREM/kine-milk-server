const ExcelJS = require('exceljs');
const NormalOrder = require('../Models/NormalOrder');
const SubscribeOrder = require('../Models/SubscribeOrder');
const Store = require('../Models/Store');
const User = require('../Models/User');
const { Op } = require('sequelize');

// Normal Payments By Store Controller
const getNormalPaymentsByStore = async (req, res) => {
  try {
    const { store_id, search, fromDate, toDate, page = 1, limit = 10 } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    // Validate store_id exists in Store model
    const store = await Store.findByPk(store_id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const where = { store_id };
    if (search) {
      where[Op.or] = [
        { order_id: { [Op.like]: `%${search}%` } },
        { '$user.name$': { [Op.like]: `%${search}%` } },
        { '$store.title$': { [Op.like]: `%${search}%` } },
      ];
    }
    if (fromDate) {
      where.odate = { [Op.gte]: new Date(fromDate) };
    }
    if (toDate) {
      where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await NormalOrder.findAndCountAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission',
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const formattedPayments = rows.map(payment => ({
      order_id: payment.order_id,
      order_date: payment.odate,
      username: payment.user?.name || 'N/A',
      store_name: payment.store?.title || 'N/A',
      total_amount: payment.o_total || 0,
      subtotal: payment.subtotal || 0,
      tax: payment.tax || 0,
      delivery_charge: payment.d_charge || 0,
      coupon_amount: payment.cou_amt || 0,
      wallet_amount: payment.wall_amt || 0,
      transaction_id: payment.trans_id || 'N/A',
    }));

    res.json({
      payments: formattedPayments,
      total: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Error fetching normal payments by store:', error);
    res.status(500).json({ message: 'Error fetching normal payments by store' });
  }
};

const downloadNormalPaymentsByStore = async (req, res) => {
  try {
    const { store_id, fromDate, toDate } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    // Validate store_id exists in Store model
    const store = await Store.findByPk(store_id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const where = { store_id };
    if (fromDate) where.odate = { [Op.gte]: new Date(fromDate) };
    if (toDate) where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };

    const payments = await NormalOrder.findAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission',
      ],
    });

    const formattedPayments = payments.map(payment => ({
      order_id: payment.order_id,
      order_date: payment.odate,
      username: payment.user?.name || 'N/A',
      store_name: payment.store?.title || 'N/A',
      total_amount: payment.o_total || 0,
      subtotal: payment.subtotal || 0,
      tax: payment.tax || 0,
      delivery_charge: payment.d_charge || 0,
      coupon_amount: payment.cou_amt || 0,
      wallet_amount: payment.wall_amt || 0,
      transaction_id: payment.trans_id || 'N/A',
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Normal Payments By Store');

    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 20 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Store Name', key: 'store_name', width: 25 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Tax', key: 'tax', width: 15 },
      { header: 'Delivery Charge', key: 'delivery_charge', width: 15 },
      { header: 'Coupon Amount', key: 'coupon_amount', width: 15 },
      { header: 'Wallet Amount', key: 'wallet_amount', width: 15 },
      { header: 'Transaction ID', key: 'transaction_id', width: 20 },
    ];

    worksheet.addRows(formattedPayments);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=normal_payments_by_store.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading normal payments by store:', error);
    res.status(500).json({ message: 'Error downloading normal payments by store' });
  }
};

const downloadSingleNormalPaymentByStore = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { store_id } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    // Validate store_id exists in Store model
    const store = await Store.findByPk(store_id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const payment = await NormalOrder.findOne({
      where: { order_id: orderId, store_id },
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission',
      ],
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found or does not belong to this store' });
    }

    const formattedPayment = {
      order_id: payment.order_id,
      order_date: payment.odate,
      username: payment.user?.name || 'N/A',
      store_name: payment.store?.title || 'N/A',
      total_amount: payment.o_total || 0,
      subtotal: payment.subtotal || 0,
      tax: payment.tax || 0,
      delivery_charge: payment.d_charge || 0,
      coupon_amount: payment.cou_amt || 0,
      wallet_amount: payment.wall_amt || 0,
      transaction_id: payment.trans_id || 'N/A',
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Normal Payment By Store');

    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 20 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Store Name', key: 'store_name', width: 25 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Tax', key: 'tax', width: 15 },
      { header: 'Delivery Charge', key: 'delivery_charge', width: 15 },
      { header: 'Coupon Amount', key: 'coupon_amount', width: 15 },
      { header: 'Wallet Amount', key: 'wallet_amount', width: 15 },
      { header: 'Transaction ID', key: 'transaction_id', width: 20 },
    ];

    worksheet.addRow(formattedPayment);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=normal_payment_${orderId}_by_store.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading single normal payment by store:', error);
    res.status(500).json({ message: 'Error downloading single normal payment by store' });
  }
};

// Subscribe Payments By Store Controller
const getSubscribePaymentsByStore = async (req, res) => {
  try {
    const { store_id, search, fromDate, toDate, page = 1, limit = 10 } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    // Validate store_id exists in Store model
    const store = await Store.findByPk(store_id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const where = { store_id };
    if (search) {
      where[Op.or] = [
        { order_id: { [Op.like]: `%${search}%` } },
        { '$user.name$': { [Op.like]: `%${search}%` } },
        { '$store.title$': { [Op.like]: `%${search}%` } },
      ];
    }
    if (fromDate) {
      where.odate = { [Op.gte]: new Date(fromDate) };
    }
    if (toDate) {
      where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await SubscribeOrder.findAndCountAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission', 'end_date',
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const formattedPayments = rows.map(payment => ({
      order_id: payment.order_id,
      order_date: payment.odate,
      username: payment.user?.name || 'N/A',
      store_name: payment.store?.title || 'N/A',
      total_amount: payment.o_total || 0,
      subtotal: payment.subtotal || 0,
      tax: payment.tax || 0,
      delivery_charge: payment.d_charge || 0,
      coupon_amount: payment.cou_amt || 0,
      wallet_amount: payment.wall_amt || 0,
      transaction_id: payment.trans_id || 'N/A',
      end_date: payment.end_date,
    }));

    res.json({
      payments: formattedPayments,
      total: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Error fetching subscribe payments by store:', error);
    res.status(500).json({ message: 'Error fetching subscribe payments by store' });
  }
};

const downloadSubscribePaymentsByStore = async (req, res) => {
  try {
    const { store_id, fromDate, toDate } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    // Validate store_id exists in Store model
    const store = await Store.findByPk(store_id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const where = { store_id };
    if (fromDate) where.odate = { [Op.gte]: new Date(fromDate) };
    if (toDate) where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };

    const payments = await SubscribeOrder.findAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission', 'end_date',
      ],
    });

    const formattedPayments = payments.map(payment => ({
      order_id: payment.order_id,
      order_date: payment.odate,
      username: payment.user?.name || 'N/A',
      store_name: payment.store?.title || 'N/A',
      total_amount: payment.o_total || 0,
      subtotal: payment.subtotal || 0,
      tax: payment.tax || 0,
      delivery_charge: payment.d_charge || 0,
      coupon_amount: payment.cou_amt || 0,
      wallet_amount: payment.wall_amt || 0,
      transaction_id: payment.trans_id || 'N/A',
      end_date: payment.end_date,
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subscribe Payments By Store');

    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 20 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Store Name', key: 'store_name', width: 25 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Tax', key: 'tax', width: 15 },
      { header: 'Delivery Charge', key: 'delivery_charge', width: 15 },
      { header: 'Coupon Amount', key: 'coupon_amount', width: 15 },
      { header: 'Wallet Amount', key: 'wallet_amount', width: 15 },
      { header: 'Transaction ID', key: 'transaction_id', width: 20 },
      { header: 'End Date', key: 'end_date', width: 20 },
    ];

    worksheet.addRows(formattedPayments);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=subscribe_payments_by_store.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading subscribe payments by store:', error);
    res.status(500).json({ message: 'Error downloading subscribe payments by store' });
  }
};

const downloadSingleSubscribePaymentByStore = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { store_id } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    // Validate store_id exists in Store model
    const store = await Store.findByPk(store_id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const payment = await SubscribeOrder.findOne({
      where: { order_id: orderId, store_id },
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission', 'end_date',
      ],
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found or does not belong to this store' });
    }

    const formattedPayment = {
      order_id: payment.order_id,
      order_date: payment.odate,
      username: payment.user?.name || 'N/A',
      store_name: payment.store?.title || 'N/A',
      total_amount: payment.o_total || 0,
      subtotal: payment.subtotal || 0,
      tax: payment.tax || 0,
      delivery_charge: payment.d_charge || 0,
      coupon_amount: payment.cou_amt || 0,
      wallet_amount: payment.wall_amt || 0,
      transaction_id: payment.trans_id || 'N/A',
      end_date: payment.end_date,
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subscribe Payment By Store');

    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 20 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Store Name', key: 'store_name', width: 25 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Tax', key: 'tax', width: 15 },
      { header: 'Delivery Charge', key: 'delivery_charge', width: 15 },
      { header: 'Coupon Amount', key: 'coupon_amount', width: 15 },
      { header: 'Wallet Amount', key: 'wallet_amount', width: 15 },
      { header: 'Transaction ID', key: 'transaction_id', width: 20 },
      { header: 'End Date', key: 'end_date', width: 20 },
    ];

    worksheet.addRow(formattedPayment);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=subscribe_payment_${orderId}_by_store.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading single subscribe payment by store:', error);
    res.status(500).json({ message: 'Error downloading single subscribe payment by store' });
  }
};

module.exports = {
  getNormalPaymentsByStore,
  downloadNormalPaymentsByStore,
downloadSingleNormalPaymentByStore,
  getSubscribePaymentsByStore,
  downloadSubscribePaymentsByStore,
  downloadSingleSubscribePaymentByStore,
};