const Tour = require('./../models/tourModel');
const User = require('./../models/userModel');
const Booking = require('./../models/bookingModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get the tour data
  const tours = await Tour.find();
  // 2) Build template

  // 3) Render that template using tour data from 1)
  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fileds: 'review user rating'
  });

  if (!tour) {
    return next(new AppError('There is no tour with this name!!', 404));
  }

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour
  });
});

exports.getLoginForm = catchAsync(async (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account'
    // tour
  });
});

exports.getAccount = (req, res, next) => {
  res.status(200).render('account', {
    title: 'Your account'
    // tour
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  //Find all bookings
  const bookings = await Booking.find({ user: req.user.id });
  // Find tours with the returned Id's
  const tourIDs = bookings.map(el => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My tours',
    tours
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  console.log(req.body);
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      runValidators: true,
      new: true
    }
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser
  });
});
