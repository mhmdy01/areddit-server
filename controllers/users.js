const bcrypt = require("bcrypt");
const usersRouter = require("express").Router();
const User = require("../models/user");
const middleware = require("../utils/middleware");

usersRouter.post("/", async (req, res, next) => {
  const receivedUser = req.body;
  if (!receivedUser.password || receivedUser.password.length < 3) {
    return res
      .status(400)
      .json({ error: "password must be 3 characters or more" });
  }

  const saltRounds = 10;
  const userToAdd = new User({
    username: receivedUser.username,
    name: receivedUser.name,
    passwordHash: await bcrypt.hash(receivedUser.password, saltRounds),
  });
  const savedUser = await userToAdd.save();

  res.status(201).json(savedUser);
});

usersRouter.get(
  "/:id",
  middleware.authorizationTokenExtractor,
  middleware.authenticatedUserExtractor,
  async (req, res, next) => {
    const authenticatedUser = req.user;
    if (!authenticatedUser) {
      return res.status(401).end();
    }

    const user = await User.findById(req.params.id).populate(
      "posts",
      "title content"
    );
    if (!user) {
      res.status(404).end();
    }
    res.json(user);
  }
);

module.exports = usersRouter;
