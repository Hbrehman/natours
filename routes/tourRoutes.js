const express = require('express');

const router = express.Router();
const tourController = require('./../controller/tourController');

// router.param('id', tourController.checkId);

router.get(
  '/top-5-cheap',
  tourController.aliasTopTours,
  tourController.getAllTours
);

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(tourController.createNewTour);

router
  .route('/:id')
  .get(tourController.getOneTour)
  .patch(tourController.updateTour)
  .delete(tourController.deleteTour);

module.exports = router;
