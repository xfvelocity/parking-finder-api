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
  googlePlaceId: String,
  prices: [
    {
      id: Number,
      hours: Number,
      price: Number,
    },
  ],
});

const MapModel = mongoose.model("Map", mapSchema);

module.exports = {
  User: UserModel,
  Map: MapModel,
};
