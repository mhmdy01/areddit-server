const supertest = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../app");
const Post = require("../models/post");
const User = require("../models/user");
const helpers = require("./test_helpers");

const api = supertest(app);
const API_URL = "/api/posts";

let authorization = "";
beforeEach(async () => {
  const user = helpers.initialUsers[0];

  await User.deleteMany({});
  const userDoc = new User({
    username: user.username,
    name: user.name,
    passwordHash: await bcrypt.hash(user.password, 10),
  });
  const savedUser = await userDoc.save();

  const userFieldsForToken = {
    id: savedUser._id,
    username: savedUser.username,
  };
  const token = jwt.sign(userFieldsForToken, process.env.JWT_SECRET);
  authorization = `Bearer ${token}`;

  await Post.deleteMany({});
  for (let post of helpers.initialPosts) {
    const postDoc = new Post({
      ...post,
      createdAt: new Date(),
      lastModified: new Date(),
      user: savedUser._id,
    });
    const savedPost = await postDoc.save();
    savedUser.posts = savedUser.posts.concat(savedPost._id);
    await savedUser.save();
  }
});

describe("read", () => {
  test("correct status, headers", async () => {
    await api
      .get(API_URL)
      .set("Authorization", authorization)
      .expect(200)
      .expect("content-type", /application\/json/);
  });
  test("correct data: #posts, specific post exists", async () => {
    const res = await api
      .get(API_URL)
      .set("Authorization", authorization)
      .expect(200)
      .expect("content-type", /application\/json/);
    const fetchedPosts = res.body;

    expect(fetchedPosts).toHaveLength(helpers.initialPosts.length);
    expect(fetchedPosts[0].title).toBe(helpers.initialPosts[0].title);
    expect(fetchedPosts.map((post) => post.content)).toContain(
      helpers.initialPosts[1].content
    );
  });
  test("correct data: each post has id/user/timestamp fields", async () => {
    const res = await api
      .get(API_URL)
      .set("Authorization", authorization)
      .expect(200)
      .expect("content-type", /application\/json/);
    const fetchedPosts = res.body;

    for (let post of fetchedPosts) {
      expect(post.id).toBeDefined();
      expect(post.user).toBeDefined();
      expect(post.createdAt).toBeDefined();
      expect(post.lastModified).toBeDefined();
    }
  });
  test("errors: token (missing or invalid) -> 401", async () => {
    await api
      .get(API_URL)
      // .set("Authorization", authorization)
      .expect(401);

    const wrong_authorization = authorization + "x";
    await api
      .get(API_URL)
      .set("Authorization", wrong_authorization)
      .expect(401);
  });
});

describe("create", () => {
  test("correct status, headers", async () => {
    const postToAdd = helpers.initialPosts[0];

    await api
      .post(API_URL)
      .set("Authorization", authorization)
      .send(postToAdd)
      .expect(201)
      .expect("content-type", /application\/json/);
  });
  test("correct data: created post added @both (posts, users) collections", async () => {
    const postsBefore = await helpers.postsInDb();
    const postToAdd = helpers.initialPosts[0];

    const res = await api
      .post(API_URL)
      .set("Authorization", authorization)
      .send(postToAdd);
    const createdPost = res.body;

    const postsAfter = await helpers.postsInDb();
    expect(postsAfter).toHaveLength(postsBefore.length + 1);
    expect(postsAfter.map((post) => post.content)).toContain(postToAdd.content);

    const usersInDb = await helpers.usersInDb();
    // obselete: now createdPost is populated before sent to client
    // expect(usersInDb[0].id).toBe(createdPost.user);
    // obselete
    expect(usersInDb[0].username).toBe(createdPost.user.username);

    expect(usersInDb[0].posts.map((postId) => postId.toString())).toContain(
      createdPost.id
    );
  });
  test("correct data: created post has id & user fields", async () => {
    const postToAdd = helpers.initialPosts[0];

    const res = await api
      .post(API_URL)
      .set("Authorization", authorization)
      .send(postToAdd);
    const createdPost = res.body;

    expect(createdPost.id).toBeDefined();
    expect(createdPost.user).toBeDefined();
    expect(createdPost.title).toBe(postToAdd.title);
  });
  test("errors: constraints (required field missing) > 400", async () => {
    const postToAdd_1 = { ...helpers.initialPosts[0], title: undefined };
    const postToAdd_2 = { ...helpers.initialPosts[0], content: undefined };

    await api
      .post(API_URL)
      .set("Authorization", authorization)
      .send(postToAdd_1)
      .expect(400);
    await api
      .post(API_URL)
      .set("Authorization", authorization)
      .send(postToAdd_2)
      .expect(400);
  });
  test("errors: token (missing or invalid) -> 401", async () => {
    const postToAdd = helpers.initialPosts[0];

    await api
      .post(API_URL)
      // .set("Authorization", authorization)
      .send(postToAdd)
      .expect(401);

    const wrong_authorization = authorization + "x";
    await api
      .post(API_URL)
      .set("Authorization", wrong_authorization)
      .send(postToAdd)
      .expect(401);
  });
});

describe("delete", () => {
  test("correct status, headers", async () => {
    const postsInDb = await helpers.postsInDb();
    const postToDelete = postsInDb[0];

    await api
      .delete(`${API_URL}/${postToDelete.id}`)
      .set("Authorization", authorization)
      .expect(204);
  });
  test("correct data: deleted post removed @both (posts, users) collections", async () => {
    const postsBefore = await helpers.postsInDb();
    const postToDelete = postsBefore[0];

    await api
      .delete(`${API_URL}/${postToDelete.id}`)
      .set("Authorization", authorization);

    const postsAfter = await helpers.postsInDb();
    expect(postsAfter).toHaveLength(postsBefore.length - 1);
    expect(postsAfter.map((post) => post.title)).not.toContain(
      postToDelete.title
    );

    const usersInDb = await helpers.usersInDb();
    expect(usersInDb[0].posts.map((postId) => postId.toString())).not.toContain(
      postToDelete.id
    );
  });
  test("errors: wrong id (not found > 404, not valid > 400)", async () => {
    const nonExistingId = await helpers.nonExistingId();
    const nonValidId = helpers.nonValidId;

    await api
      .delete(`${API_URL}/${nonExistingId}`)
      .set("Authorization", authorization)
      .expect(404);

    await api
      .delete(`${API_URL}/${nonValidId}`)
      .set("Authorization", authorization)
      .expect(400);

    const postsInDb = await helpers.postsInDb();
    expect(postsInDb).toHaveLength(helpers.initialPosts.length);
  });
  test("errors: token (missing or invalid) -> 401", async () => {
    const postsInDb = await helpers.postsInDb();
    const postToDelete = postsInDb[0];

    await api
      .delete(`${API_URL}/${postToDelete.id}`)
      // .set("Authorization", authorization)
      .expect(401);

    const wrong_authorization = authorization + "x";
    await api
      .delete(`${API_URL}/${postToDelete.id}`)
      .set("Authorization", wrong_authorization)
      .expect(401);
  });
});

describe("update", () => {
  test("correct status, headers", async () => {
    const postsInDb = await helpers.postsInDb();
    const postToUpdate = postsInDb[0];
    const changedPost = helpers.jsonSerialize({
      ...postToUpdate,
      title: postToUpdate.title.toUpperCase(),
      content: postToUpdate.content.toUpperCase().slice(0, 50),
    });

    await api
      .put(`${API_URL}/${postToUpdate.id}`)
      .set("Authorization", authorization)
      .send(changedPost)
      .expect(200)
      .expect("content-type", /application\/json/);
  });
  test("correct data: fields changed (eg. title/content/lastModified)", async () => {
    const postsInDb = await helpers.postsInDb();
    const postToUpdate = postsInDb[0];
    const changedPost = helpers.jsonSerialize({
      ...postToUpdate,
      title: postToUpdate.title.toUpperCase(),
      content: postToUpdate.content.toUpperCase().slice(0, 50),
    });

    const res = await api
      .put(`${API_URL}/${postToUpdate.id}`)
      .set("Authorization", authorization)
      .send(changedPost);
    const updatedPost = res.body;

    for (let field of ["title", "content", "lastModified"]) {
      expect(updatedPost[field]).not.toBe(postToUpdate[field]);
      if (field !== "lastModified") {
        expect(updatedPost[field]).toBe(changedPost[field]);
      }
    }
  });
  test("errors: wrong id (notfound > 404, notvalid > 400)", async () => {
    const postsInDb = await helpers.postsInDb();
    const postToUpdate = postsInDb[0];
    const changedPost = helpers.jsonSerialize({
      ...postToUpdate,
      title: postToUpdate.title.toUpperCase(),
      content: postToUpdate.content.toUpperCase().slice(0, 50),
    });
    const nonExistingId = await helpers.nonExistingId();
    const nonValidId = helpers.nonValidId;

    await api
      .put(`${API_URL}/${nonExistingId}`)
      .set("Authorization", authorization)
      .send(changedPost)
      .expect(404);

    await api
      .put(`${API_URL}/${nonValidId}`)
      .set("Authorization", authorization)
      .send(changedPost)
      .expect(400);
  });

  // TODO: test not owner? MUST many users @db first
  test("errors: token (missing, invalid, not owner) > 401", async () => {
    const postsInDb = await helpers.postsInDb();
    const postToUpdate = postsInDb[0];
    const changedPost = helpers.jsonSerialize({
      ...postToUpdate,
      title: postToUpdate.title.toUpperCase(),
      content: postToUpdate.content.toUpperCase().slice(0, 50),
    });

    await api
      .put(`${API_URL}/${postToUpdate.id}`)
      // .set("Authorization", authorization)
      .send(changedPost)
      .expect(401);

    const wrong_authorization = authorization + "x";
    await api
      .put(`${API_URL}/${postToUpdate.id}`)
      .set("Authorization", wrong_authorization)
      .send(changedPost)
      .expect(401);
  });
});

describe("comments", () => {
  test("correct data: new comment added to post, #comment increased, each comment has conten/date fields", async () => {
    const postsInDb = await helpers.postsInDb();
    const postToUpdate = postsInDb[0];
    const commentToAdd = { content: "this looks cool!" };

    const res = await api
      .post(`${API_URL}/${postToUpdate.id}/comments`)
      .set("Authorization", authorization)
      .send(commentToAdd)
      .expect(200);
    const updatedPost = res.body;
    // console.log(updatedPost);

    expect(updatedPost.comments).toHaveLength(postToUpdate.comments.length + 1);
    expect(
      updatedPost.comments[updatedPost.comments.length - 1].content
    ).toBeDefined();
    expect(updatedPost.comments[updatedPost.comments.length - 1].content).toBe(
      commentToAdd.content
    );
    expect(
      updatedPost.comments[updatedPost.comments.length - 1].date
    ).toBeDefined();
  });
});

describe.only("reactions", () => {
  test("correct data: specific reaction type incremented", async () => {
    const postsInDb = await helpers.postsInDb();
    const postToUpdate = postsInDb[0];
    const changedReactions = {
      thumbsUp: 10,
      hooray: 10,
      heart: 5,
      rocket: 0,
      eyes: 7,
    };

    const res = await api
      .put(`${API_URL}/${postToUpdate.id}/reactions`)
      .set("Authorization", authorization)
      .send(changedReactions)
      .expect(200);
    const updatedPost = res.body;
    // console.log(updatedPost);

    expect(updatedPost.reactions).toEqual(changedReactions);
  });
});

afterAll(() => {
  mongoose.connection.close();
});
