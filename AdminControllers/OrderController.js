const ExcelJS = require('exceljs');
const { Op, literal } = require('sequelize');
const NormalOrder = require('../Models/NormalOrder');
const SubscribeOrder = require('../Models/SubscribeOrder');
const Store = require('../Models/Store');
const User = require('../Models/User');
const Time = require('../Models/Time');
const SubscribeOrderProduct = require('../Models/SubscribeOrderProduct');

// Normal Orders Controller
const getNormalOrders = async (req, res) => {
  try {
    const { fromDate, toDate, storeId, page = 1, limit = 10 } = req.query;

    console.log('getNormalOrders query:', req.query);

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

    const totalCount = await NormalOrder.count({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
    });

    const offset = (page - 1) * limit;
    const rows = await NormalOrder.findAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: ['order_id', 'odate', 'status'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      logging: (sql) => console.log('SQL Query:', sql),
    });

    const formattedOrders = rows.map(order => ({
      order_id: order.order_id,
      order_date: order.odate,
      username: order.user?.name || 'N/A',
      store_name: order.store?.title || 'N/A',
      order_status: order.status || 'N/A',
      user_mobile_no: order.user?.mobile || 'N/A',
    }));

    res.json({
      orders: formattedOrders,
      total: totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error('Error fetching normal orders:', error);
    res.status(500).json({ message: 'Error fetching normal orders' });
  }
};

const downloadNormalOrders = async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.query;
    console.log('downloadNormalOrders query:', req.query);

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

    const orders = await NormalOrder.findAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: ['order_id', 'odate', 'status'],
      logging: (sql) => console.log('SQL Query:', sql),
    });

    const formattedOrders = orders.map(order => ({
      order_id: order.order_id,
      order_date: order.odate,
      username: order.user?.name || 'N/A',
      store_name: order.store?.title || 'N/A',
      order_status: order.status || 'N/A',
      user_mobile_no: order.user?.mobile || 'N/A',
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Normal Orders');

    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 20 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Store Name', key: 'store_name', width: 25 },
      { header: 'Order Status', key: 'order_status', width: 15 },
      { header: 'Mobile No', key: 'user_mobile_no', width: 15 },
    ];

    worksheet.addRows(formattedOrders);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=normal_orders.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading normal orders:', error);
    res.status(500).json({ message: 'Error downloading normal orders' });
  }
};

const downloadSingleNormalOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('downloadSingleNormalOrder params:', req.params);

    const order = await NormalOrder.findOne({
      where: { order_id: orderId },
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: ['order_id', 'odate', 'status'],
      logging: (sql) => console.log('SQL Query:', sql),
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const formattedOrder = {
      order_id: order.order_id,
      order_date: order.odate,
      username: order.user?.name || 'N/A',
      store_name: order.store?.title || 'N/A',
      order_status: order.status || 'N/A',
      user_mobile_no: order.user?.mobile || 'N/A',
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Normal Order');

    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 20 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Store Name', key: 'store_name', width: 25 },
      { header: 'Order Status', key: 'order_status', width: 15 },
      { header: 'Mobile No', key: 'user_mobile_no', width: 15 },
    ];

    worksheet.addRow(formattedOrder);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=normal_order_${orderId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading single order:', error);
    res.status(500).json({ message: 'Error downloading single order' });
  }
};

// Subscribe Orders Controller
const getSubscribeOrders = async (req, res) => {
  try {
    const { fromDate, toDate, storeId, page = 1, limit = 10 } = req.query;

    if (storeId && storeId !== 'undefined' && storeId !== '') {
      const storeExists = await Store.findByPk(storeId);
      if (!storeExists) {
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

    const include = [
      {
        model: SubscribeOrderProduct,
        as: 'orderProducts',
        attributes: ['start_date', 'end_date'],
      },
      {
        model: Store,
        as: 'store',
        attributes: ['title'],
        required: false,
      },
      {
        model: User,
        as: 'user',
        attributes: ['name', 'mobile'],
        required: false,
      },
    ];

    const offset = (page - 1) * limit;

    const { count, rows } = await SubscribeOrder.findAndCountAll({
      where,
      include,
      attributes: ['order_id', 'odate', 'status'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      logging: (sql) => console.log('SQL Query:', sql),
    });

    const formattedOrders = rows.map((order) => ({
      order_id: order.order_id, // Corrected from замовлення.order_id
      order_date: order.odate,
      username: order.user?.name || 'N/A',
      store_name: order.store?.title || 'N/A',
      order_status: order.status || 'N/A',
      user_mobile_no: order.user?.mobile || 'N/A',
      start_date: order.orderProducts?.[0]?.start_date || 'N/A',
      end_date: order.orderProducts?.[0]?.end_date || 'N/A',
    }));

    console.log('Formatted Orders:', formattedOrders);

    res.json({
      orders: formattedOrders,
      total: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Error fetching subscribe orders:', error);
    res.status(500).json({ message: 'Error fetching subscribe orders' });
  }
};

const downloadSubscribeOrders = async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.query;
    console.log('downloadSubscribeOrders query:', req.query);

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

    const orders = await SubscribeOrder.findAll({
      where,
      include: [
        {
          model: SubscribeOrderProduct,
          as: 'orderProducts',
          attributes: ['start_date', 'end_date'],
        },
        { model: Store, as: 'store', attributes: ['title'], required: false },
        { model: User, as: 'user', attributes: ['name', 'mobile'], required: false },
      ],
      attributes: ['order_id', 'odate', 'status'],
      logging: (sql) => console.log('SQL Query:', sql),
    });

    const formattedOrders = orders.map(order => ({
      order_id: order.order_id,
      order_date: order.odate,
      username: order.user?.name || 'N/A',
      store_name: order.store?.title || 'N/A',
      order_status: order.status || 'N/A',
      user_mobile_no: order.user?.mobile || 'N/A',
      start_date: order.orderProducts?.[0]?.start_date || 'N/A',
      end_date: order.orderProducts?.[0]?.end_date || 'N/A',
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subscribe Orders');

    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 20 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Store Name', key: 'store_name', width: 25 },
      { header: 'Order Status', key: 'order_status', width: 15 },
      { header: 'Mobile No', key: 'user_mobile_no', width: 15 },
      { header: 'Start Date', key: 'start_date', width: 20 },
      { header: 'End Date', key: 'end_date', width: 20 },
    ];

    worksheet.addRows(formattedOrders);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=subscribe_orders.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading subscribe orders:', error);
    res.status(500).json({ message: 'Error downloading subscribe orders' });
  }
};

const downloadSingleSubscribeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('downloadSingleSubscribeOrder params:', req.params);

    const order = await SubscribeOrder.findOne({
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
      attributes: ['order_id', 'odate', 'status'],
      logging: (sql) => console.log('SQL Query:', sql),
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const formattedOrder = {
      order_id: order.order_id,
      order_date: order.odate,
      username: order.user?.name || 'N/A',
      store_name: order.store?.title || 'N/A',
      order_status: order.status || 'N/A',
      user_mobile_no: order.user?.mobile || 'N/A',
      start_date: order.orderProducts?.[0]?.start_date || 'N/A',
      end_date: order.orderProducts?.[0]?.end_date || 'N/A',
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subscribe Order');

    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 20 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Store Name', key: 'store_name', width: 25 },
      { header: 'Order Status', key: 'order_status', width: 15 },
      { header: 'Mobile No', key: 'user_mobile_no', width: 15 },
      { header: 'Start Date', key: 'start_date', width: 20 },
      { header: 'End Date', key: 'end_date', width: 20 },
    ];

    worksheet.addRow(formattedOrder);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=subscribe_order_${orderId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading single subscribe order:', error);
    res.status(500).json({ message: 'Error downloading single subscribe order' });
  }
};


module.exports = {
  getNormalOrders,
  downloadNormalOrders,
  downloadSingleNormalOrder,
  getSubscribeOrders,
  downloadSubscribeOrders,
  downloadSingleSubscribeOrder,
};