const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const _ = require('underscore');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now + process.env.JWT_COOKIE_EXPIRES_IN * 90 * 24 * 60 * 60 * 1000
    ),
    // secure: true, // because of this option set to true, the communication will only happen on https connection on http communication will not happen
    httpOnly: true // we set it true because the cookie can newer be accessed and modified by the browser anyway. it prevents xss attcks
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(
    _.pick(req.body, [
      'name',
      'email',
      'password',
      'passwordConfirm',
      'role',
      'passwordChangedAt',
      'photo'
    ])
  );
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password..', 400));
  }
  // 2) Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // user = user.select('-password');
  // 3) if everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) varification token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if the user still exists
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }

      // 3) User might have changed password after token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (ex) {
      return next();
    }
  }
  next();
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in please log in to get access!', 401)
    );
  }

  // 2) varification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if the user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError('The user belonging to this token does no longer exit.', 401)
    );

  // 4) User might have changed password after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401)
    );
  }
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide'], role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError('There is no user with this email address', 404));
  // 2) Generate Random email token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });
  // 3) Send it to users email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the email! Try again later', 500)
    );
  }
  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!'
  });
});

// Rsest Users Password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpire: { $gt: Date.now() }
  });

  // 2) If the token has not expired and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired.', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  await user.save();

  // 4) If everything is ok send token to client
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user form collection
  const user = await User.findById(req.user.id).select('+password');
  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }
  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // 4) Log user in, send JWT

  createSendToken(user, 200, res);
});

exports.logout = (req, res, next) => {
  res.cookie('jwt', 'loggedOut', {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  });

  res.status(200).json({
    status: 'success'
  });
};
