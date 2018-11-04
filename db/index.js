const mongoose = require("mongoose");

let Item = mongoose.model('Item', {
  _id: Number,
  title: String,
  posted_at: String
});

module.exports = Item;