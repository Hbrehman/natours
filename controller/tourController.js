const Tour = require('./../models/tourModel');

exports.createNewTour = async (req, res) => {
  try {
    const tour = await Tour.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        tour
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'Fail',
      message: 'Invalid Tour'
    });
  }
};

exports.getAllTours = async (req, res) => {
  try {
    // 1) Build query
    // 1A) Filtering
    const queryObj = { ...req.query };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach(el => delete queryObj[el]);

    // console.log(req.query, queryObj);

    // 1B) Advance Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    queryStr = JSON.parse(queryStr);
    // console.log(queryStr);
    // { difficulty: 'easy', duration: { $gte: 5 } }
    // {difficult: 'easy', duration: { gte: 5 }}

    // gte, gt, lte, lt

    const query = Tour.find(queryStr);

    // 2) Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join('');
      query.sort(sortBy);
    } else {
      query.sort('-createAt');
    }

    // 3) Field limiting
    if (req.query.fields) {
      const requiredFields = req.query.fields.split(',').join(' ');
      query.select(requiredFields);
    } else {
      query.select('-__v');
    }
    // Another way to query using mongoose methods
    // const query = Tour.find()
    //   .where('difficulty')
    //   .equals('easy')
    //   .where('duration')
    //   .equals(5);

    // Execute query
    const tours = await query;

    // SEND RESPONSE
    res.json({
      status: 'success',
      results: tours.length,
      data: {
        tours
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'Fail',
      message: err
    });
  }
};

exports.getOneTour = async (req, res) => {
  try {
    // const tour = await Tour.findOne({ _id: req.params.id});
    const tour = await Tour.findById(req.params.id);
    res.status(200).json({
      status: 'Success',
      data: {
        tour
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'Fail',
      message: err
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    res.status(200).json({
      status: 'success',
      data: {
        tour
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'Fail',
      message: 'Invalid Tour'
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204);
  } catch (err) {
    res.status(400).json({
      status: 'Fail',
      message: 'Tour not found...'
    });
  }
};
