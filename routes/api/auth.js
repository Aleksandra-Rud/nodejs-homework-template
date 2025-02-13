const express = require("express");
// const Joi = require("joi");
const { BadRequest, Conflict, Unauthorized } = require("http-errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const { nanoid } = require("nanoid");

const { User } = require("../../model");
const { joiRegisterSchema, joiLoginSchema } = require("../../model/user");
const { sendEmail } = require("../../helpers");

const router = express.Router();

const { SECRET_KEY, SITE_NAME } = process.env;

// router.post("/signup")
router.post("/register", async (req, res, next) => {
  try {
    const { error } = joiRegisterSchema.validate(req.body);
    if (error) {
      throw new BadRequest(error.message);
    }
    const { name, email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      throw new Conflict("User already exist");
    }
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const verificationToken = nanoid();
    const avatarUrl = gravatar.url(email);
    const newUser = await User.create({
      name,
      email,
      verificationToken,
      password: hashPassword,
      avatarUrl,
    });
    const data = {
      to: "email",
      subject: "Confirm your email",
      html: `<a target="_blank" href="${SITE_NAME}/users/verify/${verificationToken}"">Please confirm your email</a>`,
    };

    await sendEmail(data);

    res.status(201).json({
      user: {
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// router.post("/signin")
router.post("/login", async (req, res, next) => {
  try {
    const { error } = joiLoginSchema.validate(req.body);
    if (error) {
      throw new BadRequest(error.message);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw new Unauthorized("Email or password is wrong");
    }
    if (user.verify) {
      throw new Unauthorized("Email not verified");
    }
    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      throw new Unauthorized("Email or password is wrong");
    }

    // if (!user) {
    //   throw new Unauthorized("Email not found");
    // }
    // const passwordCompare = await bcrypt.compare(password, user.password);
    // if (!passwordCompare) {
    //   throw new Unauthorized("Wrong password ");
    // }
    const { _id, name } = user;
    const payload = {
      id: _id,
    };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
    await User.findByIdAndUpdate(_id, { token });
    res.json({
      token,
      user: {
        email,
        name,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// {
//     "name": "Mira",
//     "email": "mira@gmail.com",
//     "password": "123456789"
// }
// {
//     "name": "Janise",
//     "email": "Janise@gmail.com",
//     "password": "987654321"
// }
// {
//     "name": "Janny",
//     "email": "Janny@gmail.com",
//     "password": "1599512"
// }
