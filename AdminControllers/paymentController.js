const ExcelJS = require('exceljs');
const NormalOrder = require('../Models/NormalOrder');
const SubscribeOrder = require('../Models/SubscribeOrder');
const Store = require('../Models/Store');
const User = require('../Models/User');
const { Op } = require('sequelize');
const Coupon = require('../Models/Coupon');
const SubscribeOrderProduct = require('../Models/SubscribeOrderProduct');

// Normal Payments Controller
const getNormalPayments = async (req, res) => {
  try {
    const { fromDate, toDate, storeId, page = 1, limit = 10 } = req.query;

    console.log('getNormalPayments query:', req.query);

    // Validate storeId
    if (storeId && storeId !== 'undefined' && storeId !== '') {
      const storeExists = await Store.findByPk(storeId);
      if (!storeExists) {
        console.log(`Invalid storeId: ${storeId}`);
        return res.status(400).json({ message: `Store with ID ${storeId} not found` });
      }
    }

    const where = {};
    if (storeId && storeId !== 'undefined' && storeId !== '') {
      where.store_id = storeId;
    }
    if (fromDate) {
      where.odate = { [Op.gte]: new Date(fromDate) };
    }
    if (toDate) {
      where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };
    }

    console.log('Query where:', where);

    const offset = (page - 1) * limit;
    const { count, rows } = await NormalOrder.findAndCountAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission'
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      logging: (sql) => console.log('SQL Query:', sql),
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
    console.error('Error fetching normal payments:', error);
    res.status(500).json({ message: 'Error fetching normal payments' });
  }
};

const downloadNormalPayments = async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.query;
    console.log('downloadNormalPayments query:', req.query);

    // Validate storeId
    if (storeId && storeId !== 'undefined' && storeId !== '') {
      const storeExists = await Store.findByPk(storeId);
      if (!storeExists) {
        console.log(`Invalid storeId: ${storeId}`);
        return res.status(400).json({ message: `Store with ID ${storeId} not found` });
      }
    }

    const where = {};
    if (storeId && storeId !== 'undefined' && storeId !== '') {
      where.store_id = storeId;
    }
    if (fromDate) {
      where.odate = { [Op.gte]: new Date(fromDate) };
    }
    if (toDate) {
      where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };
    }

    console.log('Query where:', where);

    const payments = await NormalOrder.findAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission'
      ],
      logging: (sql) => console.log('SQL Query:', sql),
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
    const worksheet = workbook.addWorksheet('Normal Payments');

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
    res.setHeader('Content-Disposition', 'attachment; filename=normal_payments.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading normal payments:', error);
    res.status(500).json({ message: 'Error downloading normal payments' });
  }
};

const downloadSingleNormalPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('downloadSingleNormalPayment params:', req.params);

    const payment = await NormalOrder.findOne({
      where: { order_id: orderId },
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission'
      ],
      logging: (sql) => console.log('SQL Query:', sql),
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
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
    const worksheet = workbook.addWorksheet('Normal Payment');

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
    res.setHeader('Content-Disposition', `attachment; filename=normal_payment_${orderId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading single normal payment:', error);
    res.status(500).json({ message: 'Error downloading single normal payment' });
  }
};

// Subscribe Payments Controller
const getSubscribePayments = async (req, res) => {
  try {
    const { fromDate, toDate, storeId, page = 1, limit = 10 } = req.query;

    console.log('getSubscribePayments query:', req.query);

    // Validate storeId
    if (storeId && storeId !== 'undefined' && storeId !== '') {
      const storeExists = await Store.findByPk(storeId);
      if (!storeExists) {
        console.log(`Invalid storeId: ${storeId}`);
        return res.status(400).json({ message: `Store with ID ${storeId} not found` });
      }
    }

    const where = {};
    if (storeId && storeId !== 'undefined' && storeId !== '') {
      where.store_id = storeId;
    }
    if (fromDate) {
      where.odate = { [Op.gte]: new Date(fromDate) };
    }
    if (toDate) {
      where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };
    }

    console.log('Query where:', where);

    const offset = (page - 1) * limit;
    const { count, rows } = await SubscribeOrder.findAndCountAll({
      where,
      include: [
        {
          model: SubscribeOrderProduct,
          as: 'orderProducts',
          attributes: ['start_date', 'end_date'],
        },
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission'
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      logging: (sql) => console.log('SQL Query:', sql),
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
      start_date: payment.orderProducts?.[0]?.start_date
        ? new Date(payment.orderProducts[0].start_date).toLocaleDateString()
        : 'N/A',
      end_date: payment.orderProducts?.[0]?.end_date
        ? new Date(payment.orderProducts[0].end_date).toLocaleDateString()
        : 'N/A',
    }));

    res.json({
      payments: formattedPayments,
      total: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Error fetching subscribe payments:', error);
    res.status(500).json({ message: 'Error fetching subscribe payments' });
  }
};

const downloadSubscribePayments = async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.query;
    console.log('downloadSubscribePayments query:', req.query);

    // Validate storeId
    if (storeId && storeId !== 'undefined' && storeId !== '') {
      const storeExists = await Store.findByPk(storeId);
      if (!storeExists) {
        console.log(`Invalid storeId: ${storeId}`);
        return res.status(400).json({ message: `Store with ID ${storeId} not found` });
      }
    }

    const where = {};
    if (storeId && storeId !== 'undefined' && storeId !== '') {
      where.store_id = storeId;
    }
    if (fromDate) {
      where.odate = { [Op.gte]: new Date(fromDate) };
    }
    if (toDate) {
      where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };
    }

    console.log('Query where:', where);

    const payments = await SubscribeOrder.findAll({
      where,
      include: [
        {
          model: SubscribeOrderProduct,
          as: 'orderProducts',
          attributes: ['start_date', 'end_date'],
        },
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission'
      ],
      logging: (sql) => console.log('SQL Query:', sql),
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
      start_date: payment.orderProducts?.[0]?.start_date
        ? new Date(payment.orderProducts[0].start_date).toLocaleDateString()
        : 'N/A',
      end_date: payment.orderProducts?.[0]?.end_date
        ? new Date(payment.orderProducts[0].end_date).toLocaleDateString()
        : 'N/A',
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subscribe Payments');

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
      { header: 'Start Date', key: 'start_date', width: 20 },
      { header: 'End Date', key: 'end_date', width: 20 },
    ];

    worksheet.addRows(formattedPayments);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=subscribe_payments.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading subscribe payments:', error);
    res.status(500).json({ message: 'Error downloading subscribe payments' });
  }
};

const downloadSingleSubscribePayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('downloadSingleSubscribePayment params:', req.params);

    const payment = await SubscribeOrder.findOne({
      where: { order_id: orderId },
      include: [
        {
          model: SubscribeOrderProduct,
          as: 'orderProducts',
          attributes: ['start_date', 'end_date'],
        },
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: [
        'order_id', 'odate', 'o_total', 'subtotal', 'tax', 'd_charge',
        'cou_amt', 'wall_amt', 'trans_id', 'store_charge', 'commission'
      ],
      logging: (sql) => console.log('SQL Query:', sql),
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
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
      start_date: payment.orderProducts?.[0]?.start_date
        ? new Date(payment.orderProducts[0].start_date).toLocaleDateString()
        : 'N/A',
      end_date: payment.orderProducts?.[0]?.end_date
        ? new Date(payment.orderProducts[0].end_date).toLocaleDateString()
        : 'N/A',
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subscribe Payment');

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
      { header: 'Start Date', key: 'start_date', width: 20 },
      { header: 'End Date', key: 'end_date', width: 20 },
    ];

    worksheet.addRow(formattedPayment);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=subscribe_payment_${orderId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading single subscribe payment:', error);
    res.status(500).json({ message: 'Error downloading single subscribe payment' });
  }
};

module.exports = {
  getNormalPayments,
  downloadNormalPayments,
  downloadSingleNormalPayment,
  getSubscribePayments,
  downloadSubscribePayments,
  downloadSingleSubscribePayment,
};