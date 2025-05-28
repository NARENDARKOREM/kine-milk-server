const RiderTimeSlot = require('../Models/RiderTimeSlot');
const Store = require('../Models/Store');

const upsertRiderTimeSlot = async (req, res) => {
  try {
    const { store_id, mintime, maxtime, status, id } = req.body;

    // Validate input
    if (!store_id || !mintime || !maxtime || status === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate store_id exists
    const store = await Store.findByPk(store_id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Validate time range
    const minTime = new Date(`1970-01-01T${mintime}Z`);
    const maxTime = new Date(`1970-01-01T${maxtime}Z`);
    if (minTime >= maxTime) {
      return res.status(400).json({ message: 'Min time must be before max time' });
    }

    const payload = {
      store_id,
      mintime,
      maxtime,
      status: parseInt(status),
    };

    let riderTimeSlot;
    if (id) {
      // Update existing time slot
      riderTimeSlot = await RiderTimeSlot.findByPk(id);
      if (!riderTimeSlot) {
        return res.status(404).json({ message: 'Rider time slot not found' });
      }
      await riderTimeSlot.update(payload);
    } else {
      // Create new time slot
      riderTimeSlot = await RiderTimeSlot.create({ ...payload, id: require('uuid').v4() });
    }

    return res.status(200).json({
      message: id ? 'Rider time slot updated successfully' : 'Rider time slot created successfully',
      data: riderTimeSlot,
    });
  } catch (error) {
    console.error('Error upserting rider time slot:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getRiderTimeSlotById = async (req, res) => {
  try {
    const { id } = req.params;

    const riderTimeSlot = await RiderTimeSlot.findByPk(id);
    if (!riderTimeSlot) {
      return res.status(404).json({ message: 'Rider time slot not found' });
    }

    return res.status(200).json(riderTimeSlot);
  } catch (error) {
    console.error('Error fetching rider time slot:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getRiderTimeSlotsByStore = async (req, res) => {
  try {
    const { store_id } = req.params;

    // Validate store_id exists
    const store = await Store.findByPk(store_id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const timeSlots = await RiderTimeSlot.findAll({ where: { store_id } });
    return res.status(200).json(timeSlots);
  } catch (error) {
    console.error('Error fetching rider time slots:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const deleteRiderTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const riderTimeSlot = await RiderTimeSlot.findByPk(id);
    if (!riderTimeSlot) {
      return res.status(404).json({ message: 'Rider time slot not found' });
    }

    await riderTimeSlot.destroy();
    return res.status(200).json({ message: 'Rider time slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting rider time slot:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const toggleRiderTimeSlotStatus = async (req, res) => {
  try {
    const { id, field, value } = req.body;

    if (!id || !field || value === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const riderTimeSlot = await RiderTimeSlot.findByPk(id);
    if (!riderTimeSlot) {
      return res.status(404).json({ message: 'Rider time slot not found' });
    }

    if (field !== 'status') {
      return res.status(400).json({ message: 'Invalid field for update' });
    }

    await riderTimeSlot.update({ [field]: value });
    return res.status(200).json({
      message: 'Rider time slot status updated successfully',
      data: riderTimeSlot,
    });
  } catch (error) {
    console.error('Error toggling rider time slot status:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  upsertRiderTimeSlot,
  getRiderTimeSlotById,
  getRiderTimeSlotsByStore,
  deleteRiderTimeSlot,
  toggleRiderTimeSlotStatus,
};