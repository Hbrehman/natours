const path = require('path');
const rateLimit = require('express-rate-limit');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const viewRouter = require('./routes/viewRoutes');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controller/errorController');

const app = express();
app.use(helmet());
app.use(cors());
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) Global Middleware
// Middleware to serve static content
app.use(express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour'
});

app.use('/api', limiter);

console.log(process.env.NODE_ENV);

app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Body Parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  // req.requestTime = new Date.toISOString();
  // console.log(req.cookies);
  next();
});
// This process is called mounting
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

//  Commad to open security disabled chrome tab
// chrome.exe --user-data-dir="C:/Chrome dev session" --disable-web-security
