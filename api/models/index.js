const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// ** User **
const userSchema = new Schema({
  uuid: String,
  email: {
    type: String,
    unique: true,
  },
  password: String,
});

const UserModel = mongoose.model("User", userSchema);

// ** Map **
const mapSchema = new Schema({
  name: String,
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      index: "2dsphere",
      required: true,
    },
  },
  pints: [
    {
      id: Number,
      name: String,
      price: Number,
    },
  ],
});

const MapModel = mongoose.model("Map", mapSchema);

module.exports = {
  User: UserModel,
  Map: MapModel,
};
