const ExcelJS = require('exceljs');
const Store = require('../Models/Store');
const ProductInventory = require('../Models/ProductInventory');
const Product = require('../Models/Product');
const Category = require('../Models/Category');
const StoreWeightOption = require('../Models/StoreWeightOption');
const WeightOption = require('../Models/WeightOption');
const { Op } = require('sequelize');

// Get stock reports for a single store
const getStockReportsByStore = async (req, res) => {
  try {
    const { store_id, search } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    const store = await Store.findByPk(store_id, {
      attributes: ['id', 'title', 'catid'],
      include: [
        {
          model: ProductInventory,
          as: 'productInventories',
          include: [
            {
              model: Product,
              as: 'inventoryProducts',
              include: [
                {
                  model: Category,
                  as: 'category',
                  attributes: ['id', 'title'],
                },
              ],
              attributes: ['id', 'title', 'subscription_required'],
              where: search ? { title: { [Op.like]: `%${search}%` } } : {},
            },
            {
              model: StoreWeightOption,
              as: 'storeWeightOptions',
              include: [
                {
                  model: WeightOption,
                  as: 'weightOption',
                  attributes: ['weight'],
                },
              ],
              attributes: ['quantity', 'subscription_quantity', 'total'],
            },
          ],
          attributes: ['id', 'date'],
        },
      ],
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const inventories = store.productInventories || [];
    const categoriesMap = {};

    let storeCategoryIds = [];
    try {
      storeCategoryIds = JSON.parse(store.catid);
    } catch (e) {
      storeCategoryIds = store.catid ? store.catid.split(',').map(id => id.trim()) : [];
    }

    inventories.forEach((inventory) => {
      const product = inventory.inventoryProducts;
      const category = product?.category;

      if (!category) return;

      if (!categoriesMap[category.id]) {
        categoriesMap[category.id] = {
          id: category.id,
          title: category.title,
          products: [],
        };
      }

      const weightDetails = inventory.storeWeightOptions.map((weightOpt) => ({
        weight: weightOpt.weightOption?.weight || 'N/A',
        quantity: weightOpt.quantity || 0,
        subscription_quantity: product.subscription_required === 1 ? weightOpt.subscription_quantity || 0 : 0,
      }));

      categoriesMap[category.id].products.push({
        id: product.id,
        title: product.title,
        subscription_required: product.subscription_required,
        stock: inventory.storeWeightOptions.reduce((sum, opt) => sum + (opt.quantity || 0) + (opt.subscription_quantity || 0), 0),
        lastUpdated: inventory.date,
        weightDetails,
      });
    });

    const missingCategoryIds = storeCategoryIds.filter(catId => !categoriesMap[catId]);
    const missingCategories = await Promise.all(
      missingCategoryIds.map(async (catId) => {
        const category = await Category.findByPk(catId, { attributes: ['id', 'title'] });
        return category ? { id: category.id, title: category.title, products: [] } : null;
      })
    );

    missingCategories.forEach((category) => {
      if (category) {
        categoriesMap[category.id] = category;
      }
    });

    const categories = Object.values(categoriesMap);
    const totalProducts = inventories.length;
    const totalNormalStock = inventories.reduce((sum, inv) => 
      sum + inv.storeWeightOptions.reduce((s, opt) => s + (opt.quantity || 0), 0), 0);
    const totalSubscribeStock = inventories.reduce((sum, inv) => 
      sum + inv.storeWeightOptions.reduce((s, opt) => 
        inv.inventoryProducts.subscription_required === 1 ? s + (opt.subscription_quantity || 0) : s, 0), 0);
    const totalStock = totalNormalStock + totalSubscribeStock;

    const formattedStore = {
      id: store.id,
      title: store.title,
      totalProducts,
      totalNormalStock,
      totalSubscribeStock,
      totalStock,
      categories,
    };

    res.json({ store: formattedStore });
  } catch (error) {
    console.error('Error fetching stock reports by store:', error);
    res.status(500).json({ message: 'Error fetching stock reports by store' });
  }
};

// Download stock report for a single store
const downloadStockReportsByStore = async (req, res) => {
  try {
    const { store_id } = req.query;

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    const store = await Store.findByPk(store_id, {
      include: [
        {
          model: ProductInventory,
          as: 'productInventories',
          include: [
            {
              model: Product,
              as: 'inventoryProducts',
              include: [
                {
                  model: Category,
                  as: 'category',
                  attributes: ['title'],
                },
              ],
              attributes: ['title', 'subscription_required'],
            },
            {
              model: StoreWeightOption,
              as: 'storeWeightOptions',
              include: [
                {
                  model: WeightOption,
                  as: 'weightOption',
                  attributes: ['weight'],
                },
              ],
              attributes: ['quantity', 'subscription_quantity', 'total'],
            },
          ],
          attributes: ['date'],
        },
      ],
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Stock Report - ${store.title}`);

    worksheet.columns = [
      { header: 'Store Name', key: 'storeName', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Product Title', key: 'productTitle', width: 30 },
      { header: 'Weight', key: 'weight', width: 15 },
      { header: 'Normal Stock Quantity', key: 'normalStock', width: 15 },
      { header: 'Subscription Stock Quantity', key: 'subscriptionStock', width: 15 },
      { header: 'Total Stock', key: 'totalStock', width: 15 },
      { header: 'Last Updated', key: 'lastUpdated', width: 20 },
    ];

    const inventories = store.productInventories || [];
    inventories.forEach((inventory) => {
      const weightOptions = inventory.storeWeightOptions || [];
      if (weightOptions.length > 0) {
        weightOptions.forEach((weightOpt) => {
          worksheet.addRow({
            storeName: store.title,
            category: inventory.inventoryProducts?.category?.title || 'N/A',
            productTitle: inventory.inventoryProducts?.title || 'N/A',
            weight: weightOpt.weightOption?.weight || 'N/A',
            normalStock: weightOpt.quantity || 0,
            subscriptionStock: inventory.inventoryProducts.subscription_required === 1 ? weightOpt.subscription_quantity || 0 : 0,
            totalStock: (weightOpt.quantity || 0) + (inventory.inventoryProducts.subscription_required === 1 ? weightOpt.subscription_quantity || 0 : 0),
            lastUpdated: inventory.date ? new Date(inventory.date).toLocaleDateString() : 'N/A',
          });
        });
      } else {
        worksheet.addRow({
          storeName: store.title,
          category: inventory.inventoryProducts?.category?.title || 'N/A',
          productTitle: inventory.inventoryProducts?.title || 'N/A',
          weight: 'N/A',
          normalStock: 0,
          subscriptionStock: 0,
          totalStock: 0,
          lastUpdated: inventory.date ? new Date(inventory.date).toLocaleDateString() : 'N/A',
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=stock_report_${store_id}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading stock reports by store:', error);
    res.status(500).json({ message: 'Error downloading stock reports by store' });
  }
};

// Other controllers unchanged
const getStockReports = async (req, res) => {
  try {
    const { search } = req.query;

    const where = {};
    if (search) {
      where.title = { [Op.like]: `%${search}%` };
    }

    const stores = await Store.findAll({
      where,
      attributes: ['id', 'title', 'catid'],
      include: [
        {
          model: ProductInventory,
          as: 'productInventories',
          include: [
            {
              model: Product,
              as: 'inventoryProducts',
              include: [
                {
                  model: Category,
                  as: 'category',
                  attributes: ['id', 'title'],
                },
              ],
              attributes: ['id', 'title', 'subscription_required'],
            },
            {
              model: StoreWeightOption,
              as: 'storeWeightOptions',
              include: [
                {
                  model: WeightOption,
                  as: 'weightOption',
                  attributes: ['weight'],
                },
              ],
              attributes: ['quantity', 'subscription_quantity', 'total'],
            },
          ],
          attributes: ['id', 'date'],
        },
      ],
    });

    const formattedStores = await Promise.all(
      stores.map(async (store) => {
        const inventories = store.productInventories || [];
        const categoriesMap = {};

        let storeCategoryIds = [];
        try {
          storeCategoryIds = JSON.parse(store.catid);
        } catch (e) {
          storeCategoryIds = store.catid ? store.catid.split(',').map(id => id.trim()) : [];
        }

        inventories.forEach((inventory) => {
          const product = inventory.inventoryProducts;
          const category = product?.category;

          if (!category) return;

          if (!categoriesMap[category.id]) {
            categoriesMap[category.id] = {
              id: category.id,
              title: category.title,
              products: [],
            };
          }

          const weightDetails = inventory.storeWeightOptions.map((weightOpt) => ({
            weight: weightOpt.weightOption?.weight || 'N/A',
            quantity: weightOpt.quantity || 0,
            subscription_quantity: product.subscription_required === 1 ? weightOpt.subscription_quantity || 0 : 0,
          }));

          categoriesMap[category.id].products.push({
            id: product.id,
            title: product.title,
            subscription_required: product.subscription_required,
            stock: inventory.storeWeightOptions.reduce((sum, opt) => sum + (opt.quantity || 0) + (opt.subscription_quantity || 0), 0),
            lastUpdated: inventory.date,
            weightDetails,
          });
        });

        const missingCategoryIds = storeCategoryIds.filter(catId => !categoriesMap[catId]);
        const missingCategories = await Promise.all(
          missingCategoryIds.map(async (catId) => {
            const category = await Category.findByPk(catId, { attributes: ['id', 'title'] });
            return category ? { id: category.id, title: category.title, products: [] } : null;
          })
        );

        missingCategories.forEach((category) => {
          if (category) {
            categoriesMap[category.id] = category;
          }
        });

        const categories = Object.values(categoriesMap);
        const totalProducts = inventories.length;
        const totalNormalStock = inventories.reduce((sum, inv) => 
          sum + inv.storeWeightOptions.reduce((s, opt) => s + (opt.quantity || 0), 0), 0);
        const totalSubscribeStock = inventories.reduce((sum, inv) => 
          sum + inv.storeWeightOptions.reduce((s, opt) => 
            inv.inventoryProducts.subscription_required === 1 ? s + (opt.subscription_quantity || 0) : s, 0), 0);
        const totalStock = totalNormalStock + totalSubscribeStock;

        return {
          id: store.id,
          title: store.title,
          totalProducts,
          totalNormalStock,
          totalSubscribeStock,
          totalStock,
          categories,
        };
      })
    );

    res.json({ stores: formattedStores });
  } catch (error) {
    console.error('Error fetching stock reports:', error);
    res.status(500).json({ message: 'Error fetching stock reports' });
  }
};

const downloadAllStockReports = async (req, res) => {
  try {
    const stores = await Store.findAll({
      include: [
        {
          model: ProductInventory,
          as: 'productInventories',
          include: [
            {
              model: Product,
              as: 'inventoryProducts',
              include: [
                {
                  model: Category,
                  as: 'category',
                  attributes: ['title'],
                },
              ],
              attributes: ['title', 'subscription_required'],
            },
            {
              model: StoreWeightOption,
              as: 'storeWeightOptions',
              include: [
                {
                  model: WeightOption,
                  as: 'weightOption',
                  attributes: ['weight'],
                },
              ],
              attributes: ['quantity', 'subscription_quantity', 'total'],
            },
          ],
          attributes: ['date'],
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Stock Reports');

    worksheet.columns = [
      { header: 'Store Name', key: 'storeName', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Product Title', key: 'productTitle', width: 30 },
      { header: 'Weight', key: 'weight', width: 15 },
      { header: 'Normal Stock Quantity', key: 'normalStock', width: 15 },
      { header: 'Subscription Stock Quantity', key: 'subscriptionStock', width: 15 },
      { header: 'Total Stock', key: 'totalStock', width: 15 },
      { header: 'Last Updated', key: 'lastUpdated', width: 20 },
    ];

    stores.forEach((store) => {
      const inventories = store.productInventories || [];
      inventories.forEach((inventory) => {
        const weightOptions = inventory.storeWeightOptions || [];
        if (weightOptions.length > 0) {
          weightOptions.forEach((weightOpt) => {
            worksheet.addRow({
              storeName: store.title,
              category: inventory.inventoryProducts?.category?.title || 'N/A',
              productTitle: inventory.inventoryProducts?.title || 'N/A',
              weight: weightOpt.weightOption?.weight || 'N/A',
              normalStock: weightOpt.quantity || 0,
              subscriptionStock: inventory.inventoryProducts.subscription_required === 1 ? weightOpt.subscription_quantity || 0 : 0,
              totalStock: (weightOpt.quantity || 0) + (inventory.inventoryProducts.subscription_required === 1 ? weightOpt.subscription_quantity || 0 : 0),
              lastUpdated: inventory.date ? new Date(inventory.date).toLocaleDateString() : 'N/A',
            });
          });
        } else {
          worksheet.addRow({
            storeName: store.title,
            category: inventory.inventoryProducts?.category?.title || 'N/A',
            productTitle: inventory.inventoryProducts?.title || 'N/A',
            weight: 'N/A',
            normalStock: 0,
            subscriptionStock: 0,
            totalStock: 0,
            lastUpdated: inventory.date ? new Date(inventory.date).toLocaleDateString() : 'N/A',
          });
        }
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=all_stores_stock_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading all stock reports:', error);
    res.status(500).json({ message: 'Error downloading all stock reports' });
  }
};

const downloadSingleStoreStockReport = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findOne({
      where: { id: storeId },
      include: [
        {
          model: ProductInventory,
          as: 'productInventories',
          include: [
            {
              model: Product,
              as: 'inventoryProducts',
              include: [
                {
                  model: Category,
                  as: 'category',
                  attributes: ['title'],
                },
              ],
              attributes: ['title', 'subscription_required'],
            },
            {
              model: StoreWeightOption,
              as: 'storeWeightOptions',
              include: [
                {
                  model: WeightOption,
                  as: 'weightOption',
                  attributes: ['weight'],
                },
              ],
              attributes: ['quantity', 'subscription_quantity', 'total'],
            },
          ],
          attributes: ['date'],
        },
      ],
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Stock Report - ${store.title}`);

    worksheet.columns = [
      { header: 'Store Name', key: 'storeName', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Product Title', key: 'productTitle', width: 30 },
      { header: 'Weight', key: 'weight', width: 15 },
      { header: 'Normal Stock Quantity', key: 'normalStock', width: 15 },
      { header: 'Subscription Stock Quantity', key: 'subscriptionStock', width: 15 },
      { header: 'Total Stock', key: 'totalStock', width: 15 },
      { header: 'Last Updated', key: 'lastUpdated', width: 20 },
    ];

    const inventories = store.productInventories || [];
    inventories.forEach((inventory) => {
      const weightOptions = inventory.storeWeightOptions || [];
      if (weightOptions.length > 0) {
        weightOptions.forEach((weightOpt) => {
          worksheet.addRow({
            storeName: store.title,
            category: inventory.inventoryProducts?.category?.title || 'N/A',
            productTitle: inventory.inventoryProducts?.title || 'N/A',
            weight: weightOpt.weightOption?.weight || 'N/A',
            normalStock: weightOpt.quantity || 0,
            subscriptionStock: inventory.inventoryProducts.subscription_required === 1 ? weightOpt.subscription_quantity || 0 : 0,
            totalStock: (weightOpt.quantity || 0) + (inventory.inventoryProducts.subscription_required === 1 ? weightOpt.subscription_quantity || 0 : 0),
            lastUpdated: inventory.date ? new Date(inventory.date).toLocaleDateString() : 'N/A',
          });
        });
      } else {
        worksheet.addRow({
          storeName: store.title,
          category: inventory.inventoryProducts?.category?.title || 'N/A',
          productTitle: inventory.inventoryProducts?.title || 'N/A',
          weight: 'N/A',
          normalStock: 0,
          subscriptionStock: 0,
          totalStock: 0,
          lastUpdated: inventory.date ? new Date(inventory.date).toLocaleDateString() : 'N/A',
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=stock_report_${storeId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading single store stock report:', error);
    res.status(500).json({ message: 'Error downloading single store stock report' });
  }
};

module.exports = {
  getStockReports,
  downloadAllStockReports,
  downloadSingleStoreStockReport,
  getStockReportsByStore,
  downloadStockReportsByStore,
};