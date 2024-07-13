const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv/config");

const {
  authenticateToken,
  authenticateClientToken,
} = require("./helpers/generic");

const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
});

mongoose
  .connect(process.env.DB_CONNECTION)
  .then(() => console.log("Connected to DB"));

app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: ["http://localhost:5173"],
  })
);

const publicUrls = ["/api/register", "/api/login"];

app.use(async (req, res, next) => {
  const clientToken = authenticateClientToken(req, res);

  if (clientToken.success) {
    if (publicUrls.some((url) => req.originalUrl.includes(url))) {
      return next();
    } else {
      return authenticateToken(req, res, next);
    }
  }
});

app.get("/api", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "s-max-age=1, stale-while-revalidate");
  res.end(`API`);
});

app.use("/api", require("./routes/index"));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
