const Tour = require('./../models/tourModel');
const APIFeature = require('./../utils/apiFeatures');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');

exports.createNewTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      tour
    }
  });
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage';
  next();
};

exports.getAllTours = catchAsync(async (req, res) => {
  // 1) Build query
  // 1A) Filtering
  // const queryObj = { ...req.query };
  // const excludeFields = ['page', 'sort', 'limit', 'fields'];
  // excludeFields.forEach(el => delete queryObj[el]);

  // console.log(req.query, queryObj);

  // 1B) Advance Filtering
  // let queryStr = JSON.stringify(queryObj);
  // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
  // queryStr = JSON.parse(queryStr);
  // console.log(queryStr);
  // { difficulty: 'easy', duration: { $gte: 5 } }
  // {difficult: 'easy', duration: { gte: 5 }}

  // gte, gt, lte, lt

  // const query = Tour.find(queryStr);

  // 2) Sorting
  // if (req.query.sort) {
  //   const sortBy = req.query.sort.split(',').join('');
  //   query.sort(sortBy);
  // } else {
  //   query.sort('-createAt');
  // }

  // 3) Field limiting
  // if (req.query.fields) {
  //   const requiredFields = req.query.fields.split(',').join(' ');
  //   query.select(requiredFields);
  // } else {
  //   query.select('-__v');
  // }

  // 4) Pagination

  // const page = req.query.page * 1 || 1; // 2
  // const limit = req.query.limit * 1 || 100; //3

  // const skip = (page - 1) * limit; // 3

  // if (req.query.page) {
  //   const numTours = await Tour.countDocuments();
  //   if (skip >= numTours) throw new Error('This page does not exist...');
  // }

  // query.skip(skip).limit(limit);

  // Another way to query using mongoose methods
  // const query = Tour.find()
  //   .where('difficulty')
  //   .equals('easy')
  //   .where('duration')
  //   .equals(5);

  // Execute query
  const apiFeatuer = new APIFeature(Tour.find(), req.query)
    .filtering()
    .sort()
    .limiting()
    .pagination();
  const tours = await apiFeatuer.query;

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours
    }
  });
});

exports.getOneTour = catchAsync(async (req, res, next) => {
  // const tour = await Tour.findOne({ _id: req.params.id});
  const tour = await Tour.findById(req.params.id);
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
  res.status(200).json({
    status: 'Success',
    data: {
      tour
    }
  });
});

exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
  res.status(204);
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  // Aggrigation pipeline is a mongoDB feature but mongoose gives us access to that. Using aggrigation pipeline is bit like doing a regular query. But in aggrigation we can manipulate the data in couple of different steps. To define these steps we pass in an array of so called stages. And in that array we have a lot of different stages. The documents then pass through these stages step by step in the defined sequence.
  const stats = await Tour.aggregate([
    // match is basically to select or to filter certain document it is just like filter object in mongodb, usually match stage is preliminary stage to prepare for next stages
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    // group allows us to gruop documents using an accumulator. for example we are calculating an average if we have 5 tours each of them has an rating we can then calculate average rating using group. we group documents by specifying field in id
    {
      $group: {
        // this is where we ganna specify what we want to group by
        _id: { $toUpper: '$difficulty' },
        // _id: '$ratingsAverage',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    // unwind deconstruct an array field from the input documents and then output one document for each element of the array
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: {
        numTourStarts: 1
      }
    },
    {
      $limit: 12
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});
