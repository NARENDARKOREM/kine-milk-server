const ExcelJS = require('exceljs');
const NormalOrder = require('../Models/NormalOrder');
const SubscribeOrder = require('../Models/SubscribeOrder');
const Store = require('../Models/Store');
const User = require('../Models/User');
const Time = require('../Models/Time');
const { Op } = require('sequelize');

// Normal Orders By Store Controller
const getNormalOrdersByStore = async (req, res) => {
  try {
    const { store_id, search, fromDate, toDate, page = 1, limit = 10 } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    // Build the where clause
    const where = { store_id }; // Filter by store_id
    if (search) {
      where[Op.or] = [
        { order_id: { [Op.like]: `%${search}%` } },
        { '$user.name$': { [Op.like]: `%${search}%` } },
      ];
    }
    if (fromDate) {
      where.odate = { [Op.gte]: new Date(fromDate) };
    }
    if (toDate) {
      where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };
    }

    // Get total count
    const totalCount = await NormalOrder.count({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
    });

    // Fetch paginated rows
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
    });

    // Format orders (no timeslot)
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
    console.error('Error fetching normal orders by store:', error);
    res.status(500).json({ message: 'Error fetching normal orders by store' });
  }
};

const downloadNormalOrdersByStore = async (req, res) => {
  try {
    const { store_id, fromDate, toDate } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    const where = { store_id }; // Filter by store_id
    if (fromDate) where.odate = { [Op.gte]: new Date(fromDate) };
    if (toDate) where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };

    const orders = await NormalOrder.findAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: ['order_id', 'odate', 'status'],
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
    const worksheet = workbook.addWorksheet('Normal Orders By Store');

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
    res.setHeader('Content-Disposition', 'attachment; filename=normal_orders_by_store.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading normal orders by store:', error);
    res.status(500).json({ message: 'Error downloading normal orders by store' });
  }
};

const downloadSingleNormalOrderByStore = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { store_id } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    const order = await NormalOrder.findOne({
      where: { order_id: orderId, store_id }, // Filter by store_id
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
      ],
      attributes: ['order_id', 'odate', 'status'],
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or does not belong to this store' });
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
    const worksheet = workbook.addWorksheet('Normal Order By Store');

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
    res.setHeader('Content-Disposition', `attachment; filename=normal_order_${formattedOrder.username}_by_store.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading single normal order by store:', error);
    res.status(500).json({ message: 'Error downloading single normal order by store' });
  }
};

// Subscribe Orders By Store Controller
const getSubscribeOrdersByStore = async (req, res) => {
  try {
    const { store_id, search, fromDate, toDate, page = 1, limit = 10 } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    // Build the where clause
    const where = { store_id }; // Filter by store_id
    if (search) {
      where[Op.or] = [
        { order_id: { [Op.like]: `%${search}%` } },
        { '$user.name$': { [Op.like]: `%${search}%` } },
      ];
    }
    if (fromDate) {
      where.odate = { [Op.gte]: new Date(fromDate) };
    }
    if (toDate) {
      where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };
    }

    // Get total count
    const { count, rows } = await SubscribeOrder.findAndCountAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
        { model: Time, as: 'timeslots', attributes: ['mintime', 'maxtime'] },
      ],
      attributes: ['order_id', 'odate', 'status'],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });

    // Format orders
    const formattedOrders = rows.map(order => ({
      order_id: order.order_id,
      order_date: order.odate,
      username: order.user?.name || 'N/A',
      store_name: order.store?.title || 'N/A',
      order_status: order.status || 'N/A',
      user_mobile_no: order.user?.mobile || 'N/A',
      timeslots: `${order.timeslots?.mintime || 'N/A'} - ${order.timeslots?.maxtime || 'N/A'}`,
    }));

    res.json({
      orders: formattedOrders,
      total: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Error fetching subscribe orders by store:', error);
    res.status(500).json({ message: 'Error fetching subscribe orders by store' });
  }
};

const downloadSubscribeOrdersByStore = async (req, res) => {
  try {
    const { store_id, fromDate, toDate } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    const where = { store_id }; // Filter by store_id
    if (fromDate) where.odate = { [Op.gte]: new Date(fromDate) };
    if (toDate) where.odate = { ...where.odate, [Op.lte]: new Date(toDate) };

    const orders = await SubscribeOrder.findAll({
      where,
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
        { model: Time, as: 'timeslots', attributes: ['mintime', 'maxtime'] },
      ],
      attributes: ['order_id', 'odate', 'status'],
    });

    const formattedOrders = orders.map(order => ({
      order_id: order.order_id,
      order_date: order.odate,
      username: order.user?.name || 'N/A',
      store_name: order.store?.title || 'N/A',
      order_status: order.status || 'N/A',
      user_mobile_no: order.user?.mobile || 'N/A',
      timeslots: `${order.timeslots?.mintime || 'N/A'} - ${order.timeslots?.maxtime || 'N/A'}`,
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subscribe Orders By Store');

    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 20 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Store Name', key: 'store_name', width: 25 },
      { header: 'Order Status', key: 'order_status', width: 15 },
      { header: 'Mobile No', key: 'user_mobile_no', width: 15 },
      { header: 'Timeslot', key: 'timeslots', width: 15 },
    ];

    worksheet.addRows(formattedOrders);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=subscribe_orders_by_store.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading subscribe orders by store:', error);
    res.status(500).json({ message: 'Error downloading subscribe orders by store' });
  }
};

const downloadSingleSubscribeOrderByStore = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { store_id } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    const order = await SubscribeOrder.findOne({
      where: { order_id: orderId, store_id }, // Filter by store_id
      include: [
        { model: Store, as: 'store', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'mobile'] },
        { model: Time, as: 'timeslots', attributes: ['mintime', 'maxtime'] },
      ],
      attributes: ['order_id', 'odate', 'status'],
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or does not belong to this store' });
    }

    const formattedOrder = {
      order_id: order.order_id,
      order_date: order.odate,
      username: order.user?.name || 'N/A',
      store_name: order.store?.title || 'N/A',
      order_status: order.status || 'N/A',
      user_mobile_no: order.user?.mobile || 'N/A',
      timeslots: `${order.timeslots?.mintime || 'N/A'} - ${order.timeslots?.maxtime || 'N/A'}`,
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subscribe Order By Store');

    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 20 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Store Name', key: 'store_name', width: 25 },
      { header: 'Order Status', key: 'order_status', width: 15 },
      { header: 'Mobile No', key: 'user_mobile_no', width: 15 },
      { header: 'Timeslot', key: 'timeslots', width: 15 },
    ];

    worksheet.addRow(formattedOrder);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=subscribe_order_${orderId}_by_store.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading single subscribe order by store:', error);
    res.status(500).json({ message: 'Error downloading single subscribe order by store' });
  }
};

module.exports = {
  getNormalOrdersByStore,
  downloadNormalOrdersByStore,
  downloadSingleNormalOrderByStore,
  getSubscribeOrdersByStore,
  downloadSubscribeOrdersByStore,
  downloadSingleSubscribeOrderByStore,
  // Include existing controllers if needed
//   getNormalOrders,
//   downloadNormalOrders,
//   downloadSingleNormalOrder,
//   getSubscribeOrders,
//   downloadSubscribeOrders,
//   downloadSingleSubscribeOrder,
};