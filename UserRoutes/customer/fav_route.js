const express = require('express');
const { addFavorite, getFavorites, removeFavorite } = require('../../UserControllers/customer/fav_controller');
const { isAuthenticated } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.post('/',isAuthenticated,addFavorite);
router.get('/:store_id',isAuthenticated,getFavorites);

router.delete('/',isAuthenticated,removeFavorite);



module.exports = router;
