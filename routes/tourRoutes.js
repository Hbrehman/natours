const express = require('express');

const router = express.Router();
const tourController = require('./../controller/tourController');

router.param('id', tourController.checkId);

router
  .route('/')
  .get(tourController.getAllTours)
  .post([tourController.checkBody, tourController.createNewTour]);

router
  .route('/:id')
  .get(tourController.getOneTour)
  .put(tourController.updateTour)
  .delete(tourController.deleteTour);

module.exports = router;
