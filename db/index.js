const mongoose = require("mongoose");

const Item = mongoose.model('Item', {
  _id: Number,
  title: String,
  posted_at: String
});


const Meters = mongoose.model('Meters', {
  id: Number,
  address: String,
  hot: Number,
  cold: Number
}, "Meters");

module.exports = {
  Meters: Meters,
  Item: Item
};
