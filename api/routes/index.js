const express = require("express");
const router = express.Router();
const { authenticateToken, getUserFromToken } = require("../helpers/generic");

// ** Auth **
const {
  registerUser,
  loginUser,
  verifyCode,
  loginAdmin,
} = require("../controllers/auth");

router.post("/register", registerUser);

router.post("/email-verify", verifyCode);

router.post("/login", loginUser);

router.post("/admin/login", loginAdmin);

// ** Maps **
const {
  map,
  scrapeNcp,
  addParkingInfo,
  getMapItem,
  getInfo,
  updateInfo,
} = require("../controllers/map");

router.get("/map", map);

router.get("/map/:uuid", getUserFromToken, getMapItem);

router.post("/map/ncp-scrape", scrapeNcp);

router.post("/map/:uuid/info", authenticateToken, addParkingInfo);

// ** Info **
router.get("/info", authenticateToken, getInfo);

router.post("/info/:uuid", authenticateToken, updateInfo);

module.exports = router;
