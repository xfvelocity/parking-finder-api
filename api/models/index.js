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
  name: String,
  address: String,
  rating: Number,
  placeId: String,
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
  prices: [
    {
      appPrice: Boolean,
      price: Number,
      hours: Schema.Types.Mixed,
      originalHours: Schema.Types.Mixed,
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

mapSchema.index({ location: "2dsphere" });

const MapModel = mongoose.model("Map", mapSchema);

module.exports = {
  User: UserModel,
  Map: MapModel,
};
