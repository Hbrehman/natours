class APIFeature {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filtering() {
    const queryObj = { ...this.queryString };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach(el => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    queryStr = JSON.parse(queryStr);

    this.query = this.query.find(queryStr);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join('');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createAt');
    }
    return this;
  }

  limiting() {
    if (this.queryString.fields) {
      const requiredFields = this.queryString.fields.split(',').join(' ');
      this.query.select(requiredFields);
    } else {
      this.query.select('-__v');
    }
    return this;
  }

  pagination() {
    const page = this.queryString.page * 1 || 1; // 2
    const limit = this.queryString.limit * 1 || 100; //3

    const skip = (page - 1) * limit; // 3
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeature;
