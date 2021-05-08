const supertest = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = require("../app");
const User = require("../models/user");
const helpers = require("./test_helpers");

const api = supertest(app);
const API_URL = "/api/login";

beforeEach(async () => {
  const user = helpers.initialUsers[0];

  await User.deleteMany({});
  const userDoc = new User({
    username: user.username,
    name: user.name,
    passwordHash: await bcrypt.hash(user.password, 10),
  });
  await userDoc.save();
});

describe("login", () => {
  test("username exist, password correct > 200, token", async () => {
    const userToLogin = {
      username: helpers.initialUsers[0].username,
      password: helpers.initialUsers[0].password,
    };
    const res = await api
      .post(API_URL)
      .send(userToLogin)
      .expect(200)
      .expect("content-type", /application\/json/);

    const loggedUser = res.body;
    expect(loggedUser.token).toBeDefined();
    expect(loggedUser.username).toBe(userToLogin.username);
  });
  test("username exist, password incorrect > 401", async () => {
    const usersToLogin = [
      {
        username: helpers.initialUsers[0].username,
        password: "wrong_password",
      },
      {
        username: helpers.initialUsers[0].username,
        password: undefined,
      },
    ];

    for (let userToLogin of usersToLogin) {
      const res = await api.post(API_URL).send(userToLogin).expect(401);
      expect(res.body.error).toContain("wrong username or password");
    }
  });
  test("username not exist", async () => {
    const usersToLogin = [
      {
        username: "i_dont_exist",
        password: helpers.initialUsers[0].password,
      },
      {
        username: undefined,
        password: helpers.initialUsers[0].password,
      },
    ];

    for (let userToLogin of usersToLogin) {
      const res = await api.post(API_URL).send(userToLogin).expect(401);
      expect(res.body.error).toContain("wrong username or password");
    }
  });
});

afterAll(() => {
  mongoose.connection.close();
});
