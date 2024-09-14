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
  role: String,
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
  uuid: String,
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
  infoUuid: String,
  updatedAt: String,
  updatedByUuid: String,
});

const MapModel = mongoose.model("Map", mapSchema);

// ** Location **
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

// ** Info **
const infoSchema = new Schema({
  uuid: String,
  parkingUuid: String,
  addedBy: String,
  addedOn: Date,
  openingHours: {
    monday: {
      openingTime: String,
      closingTime: String,
      isOpen: Boolean,
    },
    tuesday: {
      openingTime: String,
      closingTime: String,
      isOpen: Boolean,
    },
    wednesday: {
      openingTime: String,
      closingTime: String,
      isOpen: Boolean,
    },
    thursday: {
      openingTime: String,
      closingTime: String,
      isOpen: Boolean,
    },
    friday: {
      openingTime: String,
      closingTime: String,
      isOpen: Boolean,
    },
    saturday: {
      openingTime: String,
      closingTime: String,
      isOpen: Boolean,
    },
    sunday: {
      openingTime: String,
      closingTime: String,
      isOpen: Boolean,
    },
  },
  prices: [
    {
      hours: Number,
      price: Number,
    },
  ],
  info: {
    disabledSpaces: Number,
    spaces: Number,
  },
  status: String,
});

const InfoModel = mongoose.model("Info", infoSchema);

module.exports = {
  EmailValidation: EmailValidationModel,
  User: UserModel,
  Map: MapModel,
  Location: LocationModel,
  Info: InfoModel,
};
