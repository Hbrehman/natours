const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image please upload only images', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.resizeTourImages = async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // Processing of cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // Other images

  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (image, i) => {
      const fileName = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(image.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${fileName}`);
      req.body.images.push(fileName);
    })
  );

  next();
};

// to upload a mix of images
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);
// To upload only one image
// upload.single('image); will produce req.file
// and to upload multiple images
// upload.array('images', 5); // produces req.files

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage';
  next();
};

exports.createNewTour = factory.createOne(Tour);
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

// '/tours-within/:distance/center/:latlng/unit/:unit'
// '/tours-within/:233/center/:34.111745,-118.113491/unit/:mi'

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // MongoDb only recives radius in radians and to convert radius in radians we need to divide it by the radius of earth 3963.2 us radius of earth in miles and 6378.1 is the radius of earth in km
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat, lng',
        400
      )
    );
  }

  const tours = await Tour.find({
    // $geoWithin is a geospatial mongoDb operator.
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  // console.log(distance, lat, lng, unit);
  res.status(200).json({
    results: tours.length,
    status: 'success',
    data: {
      data: tours
    }
  });
});

module.exports.getDistances = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat, lng',
        400
      )
    );
  }

  // geoNear is only one stage in  aggregiation pipeline and this one always need to be the first one in the pipeline and it contains atleast one of the fields that contain geoSpatial index and if we have only one field with geoSpatial index then $geoNear will automatically use that but if we have multiple fields with geoSpatial index then we would have to use keys parameter in order to specify which one we want to use
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        // keys: 'startLocation',
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance'
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});

// Teri ana ka sooraj jahan marzi chamky
// meri hudod main chamka to doob jay ga
