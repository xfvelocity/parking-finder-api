const { default: axios } = require("axios");
const { Map, Location, Info, User } = require("../models/index");
const { getNCPCarParks, scrapeGooglePlaces } = require("../ncpScraper.js");
const {
  checkDistance,
  roundDecimal,
  paginatedList,
} = require("../helpers/generic.js");
const { v4: uuidv4 } = require("uuid");

// ** GET **
const getGoogleLocations = async (lat, lng, radius) => {
  const uuid = uuidv4();
  const res = await axios.post(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      includedTypes: ["parking"],
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng,
          },
          radius: radius || 500,
        },
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.displayName,places.location,places.rating,places.id,places.formattedAddress",
        "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
      },
    }
  );

  await Location.create({
    uuid,
    location: {
      type: "Point",
      coordinates: [lng, lat],
    },
  });

  return { results: res?.data?.places || [], uuid };
};

const handleNewGoogleLocations = (data, items) => {
  return data.results
    .map((r) => {
      const matchingItem = items.find((i) => {
        return checkDistance(
          i.location.coordinates[1],
          i.location.coordinates[0],
          r.location.latitude,
          r.location.longitude,
          35
        );
      });

      const itemAlreadySaved = items.find((item) => item.placeId === r.id);

      if (matchingItem) {
        return {
          name: r.displayName.text,
          address: r.formattedAddress,
          rating: r.rating,
          locationUuid: data.uuid,
          ...matchingItem,
        };
      } else if (!itemAlreadySaved) {
        return {
          uuid: uuidv4(),
          type: "google",
          name: r.displayName.text,
          address: r.formattedAddress,
          rating: r.rating,
          locationUuid: data.uuid,
          location: {
            type: "Point",
            coordinates: [r.location.longitude, r.location.latitude],
          },
          info: {},
          prices: [],
        };
      }

      return null;
    })
    .filter((x) => x);
};

const map = async (req, res) => {
  let { lat, lng, radius } = req.query;

  if (!lat || !lng) {
    return res
      .status(400)
      .send({ message: "Latitude & Longitude is required" });
  }

  lat = roundDecimal(parseFloat(lat), 4);
  lng = roundDecimal(parseFloat(lng), 4);
  radius = parseInt(radius);

  const filters = {
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: radius || 500,
      },
    },
  };

  try {
    let location = await Location.findOne(filters);

    if (req.query.hours) {
      filters.prices = {
        $elemMatch: {
          hours: { $gte: parseInt(req.query.hours) },
        },
      };
    }

    let items = (await Map.find(filters)).map((x) => x._doc);

    if (!location) {
      const results = await getGoogleLocations(lat, lng, radius);
      const newItems = handleNewGoogleLocations(results, items);

      items = await Promise.all(
        newItems.map(async (item) => {
          if (item._id) {
            await Map.findByIdAndUpdate(item._id, item);
          } else {
            await Map.create(item);
          }

          return item;
        })
      );
    }

    const response = items.map((item) => {
      const obj = {
        type: item.type,
        name: item.name,
        rating: item.rating,
        address: item.address,
        uuid: item.uuid,
        location: item.location,
      };

      if (filters.prices) {
        const sortedArray = item.prices?.sort((a, b) => a.hours - b.hours);
        const matchingPrice = sortedArray.filter(
          (x) => x.hours >= parseInt(req.query.hours)
        )[0];

        obj.matchingPrice = matchingPrice.price;
      }

      return obj;
    });

    return res.status(200).send(response);
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: e });
  }
};

const getMapItem = async (req, res) => {
  try {
    const item = await Map.findOne({ uuid: req.params.uuid });
    let response = item?._doc || {};

    if (req.user?.uuid) {
      const infos = await Info.find({ addedBy: req.user.uuid });

      response = {
        ...response,
        pendingInfoByUser: infos.some(
          (info) => info.parkingUuid === response.uuid
        ),
      };
    }

    return res.status(200).send(response);
  } catch (e) {
    console.error(e);

    return res.status(500).send({ message: e });
  }
};

const getInfo = async (req, res) => {
  try {
    const info = await paginatedList(req, Info, { status: "pending" }, {});

    info.data = await Promise.all(
      info.data.map(async (i) => {
        const user = await User.findOne({ uuid: i.addedBy });
        const parking = await Map.findOne({ uuid: i.parkingUuid });

        delete i.addedBy;
        delete i.parkingUuid;

        return {
          ...i,
          user: {
            name: user.name,
            role: user.role,
            uuid: user.uuid,
          },
          parking: {
            uuid: parking?.uuid,
            name: parking?.name,
          },
        };
      })
    );

    return res.status(200).send(info);
  } catch (e) {
    console.error(e);

    return res.status(500).send({ message: e });
  }
};

// ** POST **
const scrapeNcp = async (req, res) => {
  try {
    await getNCPCarParks(req, res);
    // await scrapeGooglePlaces();

    return res.status(200).send({});
  } catch (e) {
    console.error(e);
    return res.status(500).send({ message: e });
  }
};

const updateInfo = async (req, res) => {
  try {
    if (!["approved", "denied"].includes(req.body.status)) {
      return res
        .status(400)
        .send({ message: "Please use a status of approved or denied" });
    }

    await Info.findOneAndUpdate(
      { uuid: req.params.uuid },
      { status: req.body.status }
    );
    const info = await Info.findOne({ uuid: req.params.uuid });

    return res.status(200).send(info);
  } catch (e) {
    console.error(e);

    return res.status(500).send({ message: e });
  }
};

const addParkingInfo = async (req, res) => {
  try {
    const info = await Info.create({
      ...req.body,
      parkingUuid: req.params.uuid,
      uuid: uuidv4(),
      addedOn: new Date(),
      addedBy: req.user.uuid,
      status: "pending",
    });

    return res.status(200).send(info);
  } catch (e) {
    console.error(e);
    return res.status(500).send({ message: e });
  }
};

module.exports = {
  map,
  scrapeNcp,
  getInfo,
  updateInfo,
  addParkingInfo,
  getMapItem,
};
