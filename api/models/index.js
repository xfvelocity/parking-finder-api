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
  type: String,
  location: {
    lat: Number,
    lng: Number,
  },
  prices: [
    {
      appPrice: Boolean,
      price: Number,
      hours: Schema.Types.Mixed,
      nightRate: Boolean,
      earlyRate: Boolean,
    },
  ],
  info: {
    spaces: Number,
    disabledSpaces: Number,
    openingHours: {
      monday: [String],
      tuesday: [String],
      wednesday: [String],
      thursday: [String],
      friday: [String],
      saturday: [String],
      sunday: [String],
    },
  },
});

const MapModel = mongoose.model("Map", mapSchema);

module.exports = {
  User: UserModel,
  Map: MapModel,
};
