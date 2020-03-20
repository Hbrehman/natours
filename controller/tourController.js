const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');

const factory = require('./handlerFactory');

exports.createNewTour = factory.createOne(Tour);

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage';
  next();
};

exports.getAllTours = factory.getAll(Tour);

exports.getOneTour = factory.getOne(Tour, { path: 'reviews' });

exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

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
