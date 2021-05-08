const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const loginRouter = require("express").Router();
const User = require("../models/user");

loginRouter.post("/", async (req, res, next) => {
  const receivedUser = req.body;
  if (!receivedUser.username || !receivedUser.password) {
    return res.status(401).json({ error: "wrong username or password" });
  }

  const userFromDb = await User.findOne({ username: receivedUser.username });
  const passwordCorrect =
    userFromDb === null
      ? false
      : await bcrypt.compare(receivedUser.password, userFromDb.passwordHash);
  if (!userFromDb || !passwordCorrect) {
    return res.status(401).json({ error: "wrong username or password" });
  }

  const userFieldsForToken = {
    id: userFromDb._id,
    username: userFromDb.username,
  };
  const token = jwt.sign(userFieldsForToken, process.env.JWT_SECRET);

  res.json({
    username: userFromDb.username,
    name: userFromDb.name,
    token,
  });
});

module.exports = loginRouter;
