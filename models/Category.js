const mongoose = require('mongoose');

const subitemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
}, { _id: true });

const groupSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true
  },
  subitems: [subitemSchema]
}, { _id: true });

const categorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: true,
    unique: true
  },
  categoryImage: String,
  description: String,
  groups: [groupSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Category', categorySchema);
