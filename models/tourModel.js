const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name should not be empaty'],
      unique: true
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty']
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [2, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // this keyword only points to current document when new Document is created
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price.'
      }
    },
    summary: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description']
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      // GeoJSON. In order for this object to be recognized geo special JSON we need type and cordiante properties
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: Number,
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },

  {
    toJSON: {
      virtuals: true
    },
    toObject: {
      virtuals: true
    }
  }
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });

// For geospatial queries we need to specify index of that property like this
tourSchema.index({ startLocation: '2dsphere' });

// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // This is the name of filed in other model, in review model in this case where the reference to the current model is stored.
  localField: '_id' // this is how it is called in local model
});

tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// This is pre middleware and it is gonna run before actual event. and that event in this case is save event
// Document Middleware: runs before .save() and .create() but not before .insertMany()
// At this point we can actually act on the data before it is saved to the database

// Slug is basically a string that we can put in url usually based on some string

// This middleware is just called a pre save hook

tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// // We can also have multiple pre or post middlewares
// tourSchema.pre('save', function(next) {
//   console.log(this);
//   next();
// });

// // This middleware is just called post save hook
// tourSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// });

// Query middleware,
// The big differecne is that the 'this' keyword will point to current query and not current document as it was in case of document middleware
tourSchema.pre(/^find/, function(next) {
  this.populate({ path: 'guides', select: '-__v' });
  next();
});
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// This middleware runs after query has already executed. It can have access to documents that have returned Via docs we get access to all the documents that were returned from the query
tourSchema.post(/^find/, function(docs, next) {
  // console.log(`Query took ${Date.now() - this.start} milliseconds`);
  next();
});

// Aggrigation middleware
// 'this' keyword here points to the current aggregation object
// tourSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
