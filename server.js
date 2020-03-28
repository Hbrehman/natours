const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
  console.log('Uncaught Exception! Shutting Down...');
  console.log(err.name, err.message);
  process.exit(1);
});
dotenv.config({ path: './config.env' });
const app = require('./index');

// const DB = process.env.DATABASE.replace(
//   '<PASSWORD>',
//   process.env.DATABASE_PASSWORD
// );

mongoose
  .connect(process.env.DATABASE_LOCAL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('DB connection successfull');
  })
  .catch(err => {
    console.log(err);
  });

// console.log(process.env);
const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`Listening on port  ${port}`);
});

process.on('unhandledRejection', err => {
  console.log('Unhandled Rejection! Shutting Down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED, Shutting down gracefully');
  server.close(() => {
    console.log('Process Terminated');
  });
});
