const rateLimit = require('express-rate-limit');
const express = require('express');
const morgan = require('morgan');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controller/errorController');

const app = express();
// 1) Global Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour'
});

app.use('/api', limiter);

app.use(express.static(`${__dirname}/public`));

console.log(process.env.NODE_ENV);

app.use(express.json());

// This process is called mounting
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));

  // const err = new Error();
  // err.status = 'fail';
  // err.statusCode = 404;
  // next(err);
});

app.use(globalErrorHandler);

module.exports = app;
