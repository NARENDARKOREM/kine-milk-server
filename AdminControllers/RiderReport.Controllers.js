const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const Rider = require('../Models/Rider');
const NormalOrder = require('../Models/NormalOrder');
const SubscribeOrder = require('../Models/SubscribeOrder');
const Address = require('../Models/Address');
const NormalOrderProduct = require('../Models/NormalOrderProduct');
const SubscribeOrderProduct = require('../Models/SubscribeOrderProduct');
const Product = require('../Models/Product');

const getInstantRiderReports = async (req, res) => {
  try {
    const { search } = req.query;
    const searchConditions = search
      ? {
          [Op.or]: [
            { title: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { mobile: { [Op.like]: `%${search}%` } },
            { '$orders.order_id$': { [Op.like]: `%${search}%` } },
            { '$orders.status$': { [Op.like]: `%${search}%` } },
            { '$orders.instOrdAddress.address$': { [Op.like]: `%${search}%` } },
            { '$orders.instOrdAddress.landmark$': { [Op.like]: `%${search}%` } },
            { '$orders.NormalProducts.ProductDetails.title$': { [Op.like]: `%${search}%` } },
            { '$orders.NormalProducts.price$': { [Op.eq]: parseFloat(search) || 0 } },
          ],
        }
      : {};

    const riders = await Rider.findAll({
      where: searchConditions,
      include: [
        {
          model: NormalOrder,
          as: 'orders',
          attributes: ['id', 'order_id', 'status', 'createdAt'],
          required: false,
          include: [
            {
              model: Address,
              as: 'instOrdAddress',
              attributes: ['address', 'landmark'],
            },
            {
              model: NormalOrderProduct,
              as: 'NormalProducts',
              include: [
                {
                  model: Product,
                  as: 'ProductDetails',
                  attributes: ['id', 'title', 'img'],
                },
              ],
            },
          ],
        },
      ],
    });

    const formattedRiders = riders.map((rider) => ({
      id: rider.id,
      title: rider.title,
      email: rider.email,
      mobile: rider.mobile,
      orders: rider.orders.map((order) => ({
        id: order.id,
        order_id: order.order_id,
        status: order.status || 'N/A',
        createdAt: order.createdAt,
        orderType: 'Instant',
        address: order.instOrdAddress
          ? {
              address: order.instOrdAddress.address,
              landmark: order.instOrdAddress.landmark,
            }
          : null,
        products: order.NormalProducts.filter((op) => op.ProductDetails).map((op) => ({
          id: op.ProductDetails.id,
          title: op.ProductDetails.title,
          img: op.ProductDetails.img,
          quantity: op.pquantity,
          price: op.price,
        })),
      })),
    }));

    res.json({ riders: formattedRiders });
  } catch (error) {
    console.error('Error fetching instant rider reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSubscriptionRiderReports = async (req, res) => {
  try {
    const { search } = req.query;
    const searchConditions = search
      ? {
          [Op.or]: [
            { title: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { mobile: { [Op.like]: `%${search}%` } },
            { '$suborders.order_id$': { [Op.like]: `%${search}%` } },
            { '$suborders.status$': { [Op.like]: `%${search}%` } },
            { '$suborders.subOrdAddress.address$': { [Op.like]: `%${search}%` } },
            { '$suborders.subOrdAddress.landmark$': { [Op.like]: `%${search}%` } },
            { '$suborders.orderProducts.productDetails.title$': { [Op.like]: `%${search}%` } },
            { '$suborders.orderProducts.price$': { [Op.eq]: parseFloat(search) || 0 } },
          ],
        }
      : {};

    const riders = await Rider.findAll({
      where: searchConditions,
      include: [
        {
          model: SubscribeOrder,
          as: 'suborders',
          attributes: ['id', 'order_id', 'status', 'createdAt'],
          required: false,
          include: [
            {
              model: Address,
              as: 'subOrdAddress',
              attributes: ['address', 'landmark'],
            },
            {
              model: SubscribeOrderProduct,
              as: 'orderProducts',
              include: [
                {
                  model: Product,
                  as: 'productDetails',
                  attributes: ['id', 'title', 'img'],
                },
              ],
            },
          ],
        },
      ],
    });

    const formattedRiders = riders.map((rider) => ({
      id: rider.id,
      title: rider.title,
      email: rider.email,
      mobile: rider.mobile,
      orders: rider.suborders.map((order) => ({
        id: order.id,
        order_id: order.order_id,
        status: order.status || 'N/A',
        createdAt: order.createdAt,
        orderType: 'Subscribe',
        address: order.subOrdAddress
          ? {
              address: order.subOrdAddress.address,
              landmark: order.subOrdAddress.landmark,
            }
          : null,
        products: order.orderProducts.filter((op) => op.productDetails).map((op) => ({
          id: op.productDetails.id,
          title: op.productDetails.title,
          img: op.productDetails.img,
          quantity: op.pquantity,
          price: op.price,
        })),
      })),
    }));

    res.json({ riders: formattedRiders });
  } catch (error) {
    console.error('Error fetching subscription rider reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCombinedRiderReports = async (req, res) => {
  try {
    const { search } = req.query;
    const searchConditions = search
      ? {
          [Op.or]: [
            { title: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { mobile: { [Op.like]: `%${search}%` } },
            { '$orders.order_id$': { [Op.like]: `%${search}%` } },
            { '$orders.status$': { [Op.like]: `%${search}%` } },
            { '$orders.instOrdAddress.address$': { [Op.like]: `%${search}%` } },
            { '$orders.instOrdAddress.landmark$': { [Op.like]: `%${search}%` } },
            { '$orders.NormalProducts.ProductDetails.title$': { [Op.like]: `%${search}%` } },
            { '$orders.NormalProducts.price$': { [Op.eq]: parseFloat(search) || 0 } },
            { '$suborders.order_id$': { [Op.like]: `%${search}%` } },
            { '$suborders.status$': { [Op.like]: `%${search}%` } },
            { '$suborders.subOrdAddress.address$': { [Op.like]: `%${search}%` } },
            { '$suborders.subOrdAddress.landmark$': { [Op.like]: `%${search}%` } },
            { '$suborders.orderProducts.productDetails.title$': { [Op.like]: `%${search}%` } },
            { '$suborders.orderProducts.price$': { [Op.eq]: parseFloat(search) || 0 } },
          ],
        }
      : {};

    const riders = await Rider.findAll({
      where: searchConditions,
      include: [
        {
          model: NormalOrder,
          as: 'orders',
          attributes: ['id', 'order_id', 'status', 'createdAt'],
          required: false,
          include: [
            {
              model: Address,
              as: 'instOrdAddress',
              attributes: ['address', 'landmark'],
            },
            {
              model: NormalOrderProduct,
              as: 'NormalProducts',
              include: [
                {
                  model: Product,
                  as: 'ProductDetails',
                  attributes: ['id', 'title', 'img'],
                },
              ],
            },
          ],
        },
        {
          model: SubscribeOrder,
          as: 'suborders',
          attributes: ['id', 'order_id', 'status', 'createdAt'],
          required: false,
          include: [
            {
              model: Address,
              as: 'subOrdAddress',
              attributes: ['address', 'landmark'],
            },
            {
              model: SubscribeOrderProduct,
              as: 'orderProducts',
              include: [
                {
                  model: Product,
                  as: 'productDetails',
                  attributes: ['id', 'title', 'img'],
                },
              ],
            },
          ],
        },
      ],
    });

    const formattedRiders = riders.map((rider) => ({
      id: rider.id,
      title: rider.title,
      email: rider.email,
      mobile: rider.mobile,
      orders: [
        ...rider.orders.map((order) => ({
          id: order.id,
          order_id: order.order_id,
          status: order.status || 'N/A',
          createdAt: order.createdAt,
          orderType: 'Instant',
          address: order.instOrdAddress
            ? {
                address: order.instOrdAddress.address,
                landmark: order.instOrdAddress.landmark,
              }
            : null,
          products: order.NormalProducts.filter((op) => op.ProductDetails).map((op) => ({
            id: op.ProductDetails.id,
            title: op.ProductDetails.title,
            img: op.ProductDetails.img,
            quantity: op.pquantity,
            price: op.price,
          })),
        })),
        ...rider.suborders.map((order) => ({
          id: order.id,
          order_id: order.order_id,
          status: order.status || 'N/A',
          createdAt: order.createdAt,
          orderType: 'Subscribe',
          address: order.subOrdAddress
            ? {
                address: order.subOrdAddress.address,
                landmark: order.subOrdAddress.landmark,
              }
            : null,
          products: order.orderProducts.filter((op) => op.productDetails).map((op) => ({
            id: op.productDetails.id,
            title: op.productDetails.title,
            img: op.productDetails.img,
            quantity: op.pquantity,
            price: op.price,
          })),
        })),
      ],
    }));

    console.log('Formatted riders:', JSON.stringify(formattedRiders, null, 2)); // Debug log
    res.json({ riders: formattedRiders });
  } catch (error) {
    console.error('Error fetching combined rider reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const generateExcel = (riders, reportType) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`${reportType} Rider Reports`);

  worksheet.columns = [
    { header: 'Rider Name', key: 'riderName', width: 20 },
    { header: 'Total Orders', key: 'totalOrders', width: 15 },
  ];

  const rows = riders.map((rider) => ({
    riderName: rider.title || 'N/A',
    totalOrders: rider.orders.length,
  }));

  console.log('Excel rows:', JSON.stringify(rows, null, 2)); // Debug log
  rows.forEach((row) => worksheet.addRow(row));

  return workbook;
};

const generateDetailedExcel = (riders, reportType) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`${reportType} Rider Report`);

  worksheet.columns = [
    { header: 'Rider Name', key: 'riderName', width: 20 },
    { header: 'Order ID', key: 'orderId', width: 15 },
    { header: 'Order Type', key: 'orderType', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Product Title', key: 'productTitle', width: 25 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Price', key: 'price', width: 10 },
    { header: 'Address', key: 'address', width: 30 },
  ];

  riders.forEach((rider) => {
    const orders = rider.orders.filter((order) => reportType === 'Combined' || order.orderType === reportType);
    orders.forEach((order) => {
      order.products.forEach((product) => {
        worksheet.addRow({
          riderName: rider.title || 'N/A',
          orderId: order.order_id || 'N/A',
          orderType: order.orderType || 'N/A',
          status: order.status || 'N/A',
          date: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
          productTitle: product.title || 'N/A',
          quantity: product.quantity || 0,
          price: product.price || 0,
          address: order.address
            ? `${order.address.address}${order.address.landmark ? ', ' + order.address.landmark : ''}`
            : 'N/A',
        });
      });
    });
  });

  return workbook;
};

const downloadInstantRiderReports = async (req, res) => {
  try {
    const riders = await Rider.findAll({
      include: [
        {
          model: NormalOrder,
          as: 'orders',
          attributes: ['id', 'order_id', 'status', 'createdAt'],
          include: [
            {
              model: Address,
              as: 'instOrdAddress',
              attributes: ['address', 'landmark'],
            },
            {
              model: NormalOrderProduct,
              as: 'NormalProducts',
              include: [
                {
                  model: Product,
                  as: 'ProductDetails',
                  attributes: ['id', 'title', 'img'],
                },
              ],
            },
          ],
        },
      ],
    });

    const formattedRiders = riders.map((rider) => ({
      id: rider.id,
      title: rider.title,
      orders: rider.orders.map((order) => ({
        id: order.id,
        order_id: order.order_id,
        status: order.status || 'N/A',
        createdAt: order.createdAt,
        orderType: 'Instant',
        address: order.instOrdAddress
          ? {
              address: order.instOrdAddress.address,
              landmark: order.instOrdAddress.landmark,
            }
          : null,
        products: order.NormalProducts.filter((op) => op.ProductDetails).map((op) => ({
          id: op.ProductDetails.id,
          title: op.ProductDetails.title,
          img: op.ProductDetails.img,
          quantity: op.pquantity,
          price: op.price,
        })),
      })),
    }));

    const workbook = generateExcel(formattedRiders, 'Instant');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="all_riders_instant_report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading instant rider reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const downloadSubscriptionRiderReports = async (req, res) => {
  try {
    const riders = await Rider.findAll({
      include: [
        {
          model: SubscribeOrder,
          as: 'suborders',
          attributes: ['id', 'order_id', 'status', 'createdAt'],
          include: [
            {
              model: Address,
              as: 'subOrdAddress',
              attributes: ['address', 'landmark'],
            },
            {
              model: SubscribeOrderProduct,
              as: 'orderProducts',
              include: [
                {
                  model: Product,
                  as: 'productDetails',
                  attributes: ['id', 'title', 'img'],
                },
              ],
            },
          ],
        },
      ],
    });

    const formattedRiders = riders.map((rider) => ({
      id: rider.id,
      title: rider.title,
      orders: rider.suborders.map((order) => ({
        id: order.id,
        order_id: order.order_id,
        status: order.status || 'N/A',
        createdAt: order.createdAt,
        orderType: 'Subscribe',
        address: order.subOrdAddress
          ? {
              address: order.subOrdAddress.address,
              landmark: order.subOrdAddress.landmark,
            }
          : null,
        products: order.orderProducts.filter((op) => op.productDetails).map((op) => ({
          id: op.productDetails.id,
          title: op.productDetails.title,
          img: op.productDetails.img,
          quantity: op.pquantity,
          price: op.price,
        })),
      })),
    }));

    const workbook = generateExcel(formattedRiders, 'Subscription');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="all_riders_subscription_report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading subscription rider reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const downloadSingleRiderReport = async (req, res) => {
  try {
    const { riderId } = req.params;
    const rider = await Rider.findByPk(riderId, {
      include: [
        {
          model: NormalOrder,
          as: 'orders',
          attributes: ['id', 'order_id', 'status', 'createdAt'],
          include: [
            {
              model: Address,
              as: 'instOrdAddress',
              attributes: ['address', 'landmark'],
            },
            {
              model: NormalOrderProduct,
              as: 'NormalProducts',
              include: [
                {
                  model: Product,
                  as: 'ProductDetails',
                  attributes: ['id', 'title', 'img'],
                },
              ],
            },
          ],
        },
        {
          model: SubscribeOrder,
          as: 'suborders',
          attributes: ['id', 'order_id', 'status', 'createdAt'],
          include: [
            {
              model: Address,
              as: 'subOrdAddress',
              attributes: ['address', 'landmark'],
            },
            {
              model: SubscribeOrderProduct,
              as: 'orderProducts',
              include: [
                {
                  model: Product,
                  as: 'productDetails',
                  attributes: ['id', 'title', 'img'],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    const formattedRider = {
      id: rider.id,
      title: rider.title,
      orders: [
        ...rider.orders.map((order) => ({
          id: order.id,
          order_id: order.order_id,
          status: order.status || 'N/A',
          createdAt: order.createdAt,
          orderType: 'Instant',
          address: order.instOrdAddress
            ? {
                address: order.instOrdAddress.address,
                landmark: order.instOrdAddress.landmark,
              }
            : null,
          products: order.NormalProducts.filter((op) => op.ProductDetails).map((op) => ({
            id: op.ProductDetails.id,
            title: op.ProductDetails.title,
            img: op.ProductDetails.img,
            quantity: op.pquantity,
            price: op.price,
          })),
        })),
        ...rider.suborders.map((order) => ({
          id: order.id,
          order_id: order.order_id,
          status: order.status || 'N/A',
          createdAt: order.createdAt,
          orderType: 'Subscribe',
          address: order.subOrdAddress
            ? {
                address: order.subOrdAddress.address,
                landmark: order.subOrdAddress.landmark,
              }
            : null,
          products: order.orderProducts.filter((op) => op.productDetails).map((op) => ({
            id: op.productDetails.id,
            title: op.productDetails.title,
            img: op.productDetails.img,
            quantity: op.pquantity,
            price: op.price,
          })),
        })),
      ],
    };

    let ridername = formattedRider.title || 'unknown_rider';
    ridername = ridername
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_')
      .trim();

    const workbook = generateDetailedExcel([formattedRider], 'Combined');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rider_report_${encodeURIComponent(ridername)}.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading single rider report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const downloadCombinedRiderReports = async (req, res) => {
  try {
    const riders = await Rider.findAll({
      include: [
        {
          model: NormalOrder,
          as: 'orders',
          attributes: ['id', 'order_id', 'status', 'createdAt'],
          include: [
            {
              model: Address,
              as: 'instOrdAddress',
              attributes: ['address', 'landmark'],
            },
            {
              model: NormalOrderProduct,
              as: 'NormalProducts',
              include: [
                {
                  model: Product,
                  as: 'ProductDetails',
                  attributes: ['id', 'title', 'img'],
                },
              ],
            },
          ],
        },
        {
          model: SubscribeOrder,
          as: 'suborders',
          attributes: ['id', 'order_id', 'status', 'createdAt'],
          include: [
            {
              model: Address,
              as: 'subOrdAddress',
              attributes: ['address', 'landmark'],
            },
            {
              model: SubscribeOrderProduct,
              as: 'orderProducts',
              include: [
                {
                  model: Product,
                  as: 'productDetails',
                  attributes: ['id', 'title', 'img'],
                },
              ],
            },
          ],
        },
      ],
    });

    const formattedRiders = riders.map((rider) => ({
      id: rider.id,
      title: rider.title,
      orders: [
        ...rider.orders.map((order) => ({
          id: order.id,
          order_id: order.order_id,
          status: order.status || 'N/A',
          createdAt: order.createdAt,
          orderType: 'Instant',
          address: order.instOrdAddress
            ? {
                address: order.instOrdAddress.address,
                landmark: order.instOrdAddress.landmark,
              }
            : null,
          products: order.NormalProducts.filter((op) => op.ProductDetails).map((op) => ({
            id: op.ProductDetails.id,
            title: op.ProductDetails.title,
            img: op.ProductDetails.img,
            quantity: op.pquantity,
            price: op.price,
          })),
        })),
        ...rider.suborders.map((order) => ({
          id: order.id,
          order_id: order.order_id,
          status: order.status || 'N/A',
          createdAt: order.createdAt,
          orderType: 'Subscribe',
          address: order.subOrdAddress
            ? {
                address: order.subOrdAddress.address,
                landmark: order.subOrdAddress.landmark,
              }
            : null,
          products: order.orderProducts.filter((op) => op.productDetails).map((op) => ({
            id: op.productDetails.id,
            title: op.productDetails.title,
            img: op.productDetails.img,
            quantity: op.pquantity,
            price: op.price,
          })),
        })),
      ],
    }));

    const workbook = generateDetailedExcel(formattedRiders, 'Combined');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="combined_rider_reports.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading combined rider reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Routes
module.exports = {
  getInstantRiderReports,
  getSubscriptionRiderReports,
  getCombinedRiderReports,
  downloadInstantRiderReports,
  downloadSubscriptionRiderReports,
  downloadCombinedRiderReports ,
  downloadSingleRiderReport}