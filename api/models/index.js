const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// ** User **
const userSchema = new Schema({
  uuid: String,
  name: String,
  email: {
    type: String,
    unique: true,
  },
  password: String,
  emailVerified: Boolean,
});

const UserModel = mongoose.model("User", userSchema);

// ** Email Verification **
const emailValidationSchema = new Schema({
  uuid: String,
  code: Number,
  createdAt: {
    type: Date,
    default: Date.now(),
    expires: "15m",
  },
});

const EmailValidationModel = mongoose.model(
  "EmailValidation",
  emailValidationSchema
);

// ** Map **
const mapSchema = new Schema({
  type: String,
  name: String,
  address: String,
  rating: Number,
  locationUuid: String,
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
      hours: Number,
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
    updatedAt: String,
    updatedByUuid: String,
  },
});

const MapModel = mongoose.model("Map", mapSchema);

const locationSchema = new Schema({
  uuid: String,
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
});

const LocationModel = mongoose.model("Location", locationSchema);

module.exports = {
  EmailValidation: EmailValidationModel,
  User: UserModel,
  Map: MapModel,
  Location: LocationModel,
};
