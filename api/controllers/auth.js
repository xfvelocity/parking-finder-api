const {
  hashPassword,
  comparePassword,
  sendEmailVerification,
} = require("../helpers/generic");
const { User, EmailValidation } = require("../models/index");

const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

// ** Register **
const registerUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!name) {
      return res.status(500).send({ message: "Name is required" });
    }

    const passwordRegex = new RegExp("^(?=.*[A-Za-z])(?=.*d)[A-Za-zd]{6,}$");

    if (passwordRegex.test(password)) {
      return res
        .status(500)
        .send({ message: "Password must include 6 characters and 1 number" });
    }

    if (password)
      if (!email) {
        return res.status(500).send({ message: "Email is required" });
      } else {
        const emailExists = await User.findOne({ email });

        if (emailExists) {
          return res.status(500).send({ message: "Email is already taken" });
        }
      }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      uuid: uuidv4(),
      email,
      name,
      password: hashedPassword,
      emailVerified: false,
    });

    await sendEmailVerification(user);

    return res.status(200).send({
      uuid: user.uuid,
      emailVerified: false,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// ** Login **
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(500).send({ message: "Incorrect email or password" });
    }

    const passwordMatch = await comparePassword(password, user.password);

    if (passwordMatch) {
      let userObject = {
        uuid: user.uuid,
        emailVerified: user.emailVerified,
      };

      if (user.emailVerified) {
        const accessToken = jwt.sign(user.toJSON(), process.env.JWT_SECRET);

        userObject = {
          ...userObject,
          name: user.name,
          email: user.email,
          accessToken,
        };
      } else {
        await sendEmailVerification(user);
      }

      res.status(200).send(userObject);
    } else {
      return res.status(500).send({ message: "Incorrect email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// ** Verify code **
const verifyCode = async (req, res) => {
  try {
    const { uuid, code } = req.body;

    const emailVerification = await EmailValidation.findOne({ uuid });

    if (!emailVerification) {
      return res.status(500).send({ message: "Code has expired" });
    }

    if (emailVerification.code === parseInt(code)) {
      const user = await User.findOne({ uuid });

      await User.findByIdAndUpdate(user._id, { emailVerified: true });
      await EmailValidation.findByIdAndDelete(emailVerification._id);

      const accessToken = jwt.sign(user.toJSON(), process.env.JWT_SECRET);

      res.status(200).send({
        name: user.name,
        email: user.email,
        uuid: user.uuid,
        emailVerified: true,
        accessToken,
      });
    } else {
      return res.status(500).send({ message: "Invalid code" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyCode,
};
