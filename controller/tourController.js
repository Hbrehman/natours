const fs = require('fs');

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`, 'utf8')
);

exports.checkId = function(req, res, next, val) {
  const tour = tours.find(c => c.id === parseInt(val, 10));
  if (!tour)
    return res.status(404).json({
      status: 'fail',
      message: 'Tour with given id was not found.'
    });
  next();
};

exports.checkBody = (req, res, next) => {
  if (!(req.body.name && req.body.price)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Name or price should not be empaty...'
    });
  }
  next();
};

exports.getAllTours = (req, res) => {
  res.json({
    status: 'success',
    results: tours.length,
    data: {
      tours
    }
  });
};

exports.createNewTour = (req, res) => {
  const newId = tours[tours.length - 1].id + 1;
  // const newTour = { newId, ...req.body }
  const newTour = Object.assign({id: newId} , req.body);
  tours.push(newTour);
  fs.writeFile(
    `${__dirname}/../dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    'utf-8',
    err => {
      if (err) res.status(400).send(err);
    }
  );
  res.status(201).json({
    status: 'success',
    data: {
      newTour
    }
  });
};

exports.getOneTour = (req, res) => {
  const tour = tours.find(c => c.id === parseInt(req.params.id, 10));

  res.status(200).json({
    status: 'Success',
    data: {
      tour
    }
  });
};

exports.updateTour = (req, res) => {
  const tour = tours.find(t => {
    if (t.id === parseInt(req.params.id, 10)) {
      (t.name = req.body.name),
      (t.duration = req.body.duration),
      (t.difficulty = req.body.difficulty);
      return t;
    }
  });

  if (!tour)
    return res.status(404).json({
      status: 'false',
      data: {
        message: 'Tour with given id was not found...'
      }
    });
  res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  });
};

exports.deleteTour = (req, res) => {
  const tourIndex = tours.findIndex(c => parseInt(req.params.id, 10) === c.id);
  const tour = tours.splice(tourIndex, 1);

  res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  });
};

// for (let i = 0; i < tours.length; i++) {
//     if (parseInt(req.params.id) === tours[i].id) {
//         const tour = tours.splice(i, 1);
//         return res.status(200).json({
//             status: 'success',
//             data: {
//                 tour
//             }
//         })
//     }
// }
