const supertest = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const app = require("../app");
const User = require("../models/user");
const helpers = require("./test_helpers");

const api = supertest(app);
const API_URL = "/api/users";

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

describe("create", () => {
  test("username valid, password valid > 201, created_user exists, #users increased", async () => {
    const usersBefore = await helpers.usersInDb();
    const userToAdd = { ...helpers.initialUsers[0], username: "a_user" };

    const res = await api
      .post(API_URL)
      .send(userToAdd)
      .expect(201)
      .expect("content-type", /application\/json/);

    const createdUser = res.body;
    expect(createdUser.id).toBeDefined();
    expect(createdUser.passwordHash).not.toBeDefined();
    expect(createdUser.username).toBe(userToAdd.username);

    const usersAfter = await helpers.usersInDb();
    expect(usersAfter).toHaveLength(usersBefore.length + 1);
    expect(usersAfter.map((u) => u.username)).toContain(userToAdd.username);
  });
  test("username valid, password invalid (missing/short_len) > 400", async () => {
    const usersBefore = await helpers.usersInDb();
    const userToAdd_1 = {
      username: "a_user",
      name: "some name",
      password: undefined,
    };
    const userToAdd_2 = {
      username: "a_user",
      name: "some name",
      password: "12",
    };

    const res_1 = await api.post(API_URL).send(userToAdd_1).expect(400);
    const res_2 = await api.post(API_URL).send(userToAdd_2).expect(400);
    expect(res_2.body.error).toContain("password must be 3");

    const usersAfter = await helpers.usersInDb();
    expect(usersAfter).toHaveLength(usersBefore.length);
  });
  test("username invalid (missing/duplicate/short_len) > 400", async () => {
    const usersBefore = await helpers.usersInDb();
    const userToAdd_1 = { ...helpers.initialUsers[0], username: undefined };
    const userToAdd_2 = helpers.initialUsers[0];
    const userToAdd_3 = { ...helpers.initialUsers[0], username: "ab" };

    const res_1 = await api.post(API_URL).send(userToAdd_1).expect(400);
    const res_2 = await api.post(API_URL).send(userToAdd_2).expect(400);
    const res_3 = await api.post(API_URL).send(userToAdd_3).expect(400);
    expect(res_2.body.error).toContain("`username` to be unique");
    expect(res_3.body.error).toContain(
      "is shorter than the minimum allowed length"
    );

    const usersAfter = await helpers.usersInDb();
    expect(usersAfter).toHaveLength(usersBefore.length);
  });
});

afterAll(() => {
  mongoose.connection.close();
});
