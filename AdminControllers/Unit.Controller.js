const Unit = require('../Models/Unit');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const getAllUnits = async (req, res) => {
  try {
    const units = await Unit.findAll({
      where: { status: 1 },
      attributes: ['id', 'name', 'unit', 'status'],
      order: [['name', 'ASC']],
    });
    res.json({ units });
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ message: 'Error fetching units' });
  }
};

const upsertUnit = async (req, res) => {
  try {
    const { id, name, unit, status = 1 } = req.body;
    if (!name || !unit) {
      return res.status(400).json({ message: 'Weight/Volume and unit are required' });
    }
    if (!['kg', 'g', 'mg', 't', 'µg', 'L', 'mL', 'cm³', 'dm³', 'm³'].includes(unit)) {
      return res.status(400).json({ message: 'Invalid unit type' });
    }

    if (id) {
      // Update existing unit
      const existingUnit = await Unit.findByPk(id);
      if (!existingUnit) {
        return res.status(404).json({ message: 'Unit not found' });
      }
      const duplicateUnit = await Unit.findOne({
        where: { name, unit, id: { [Op.ne]: id } },
      });
      if (duplicateUnit) {
        return res.status(409).json({ message: 'Weight/Volume and unit combination already exists' });
      }
      existingUnit.name = name;
      existingUnit.unit = unit;
      existingUnit.status = status;
      await existingUnit.save();
      res.json({ unit: existingUnit, message: 'Unit updated successfully' });
    } else {
      // Create new unit
      const duplicateUnit = await Unit.findOne({ where: { name, unit } });
      if (duplicateUnit) {
        return res.status(409).json({ message: 'Weight/Volume and unit combination already exists' });
      }
      const newUnit = await Unit.create({ id: uuidv4(), name, unit, status });
      res.status(201).json({ unit: newUnit, message: 'Unit created successfully' });
    }
  } catch (error) {
    console.error('Error upserting unit:', error);
    res.status(500).json({ message: 'Error upserting unit' });
  }
};

const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const unit = await Unit.findByPk(id);
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }
    await unit.destroy();
    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ message: 'Error deleting unit' });
  }
};

const updateStatus = async (req, res) => {
  try {
    console.log('Update Status Request Body:', req.body);
    const { id, field, value } = req.body;
    if (field !== 'status') {
      return res.status(400).json({ message: 'Invalid field for update' });
    }
    const unit = await Unit.findByPk(id);
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }
    unit[field] = value;
    await unit.save();
    res.json({ unit, message: 'Unit status updated successfully' });
  } catch (error) {
    console.error('Error updating unit status:', error);
    res.status(500).json({ message: 'Error updating unit status' });
  }
};

module.exports = {
  getAllUnits,
  upsertUnit,
  deleteUnit,
  updateStatus,
};