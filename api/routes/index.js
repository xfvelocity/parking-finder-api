const express = require("express");
const router = express.Router();

// ** Auth **
const { registerUser, loginUser, verifyCode } = require("../controllers/auth");

router.post("/register", registerUser);

router.post("/email-verify", verifyCode);

router.post("/login", loginUser);

// ** Maps **
const { map, scrapeNcp, addParkingInfo } = require("../controllers/map");

router.get("/map", map);

router.post("/map/ncp-scrape", scrapeNcp);

router.post("/map/:uuid/info", addParkingInfo);

module.exports = router;
