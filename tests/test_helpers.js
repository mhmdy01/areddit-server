const Post = require("../models/post");
const User = require("../models/user");

const initialPosts = new Array(5).fill(0).map((e, i) => {
  return {
    title: `title #${i + 1}`,
    content: `content #${i + 1}`,
  };
});
const postsInDb = async () => {
  const posts = await Post.find({});
  return posts.map((post) => post.toJSON());
};

const initialUsers = [{ username: "root", name: "the root", password: "root" }];
const usersInDb = async () => {
  const users = await User.find({});
  return users.map((user) => user.toJSON());
};

const nonValidId = 123;
const nonExistingId = async () => {
  const post = new Post({
    ...initialPosts[0],
    createdAt: new Date(),
    lastModified: new Date(),
  });
  await post.save();
  await post.remove();
  return post._id.toString();
};

const jsonSerialize = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

module.exports = {
  initialPosts,
  postsInDb,
  initialUsers,
  usersInDb,
  nonValidId,
  nonExistingId,
  jsonSerialize,
};
