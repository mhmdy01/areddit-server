const postsRouter = require("express").Router();
const Post = require("../models/post");

postsRouter.get("/", async (req, res) => {
  const authenticatedUser = req.user;
  if (!authenticatedUser) {
    return res.status(401).end();
  }

  const posts = await Post.find({}).populate("user", "username name");
  res.json(posts);
});

postsRouter.post("/", async (req, res) => {
  const authenticatedUser = req.user;
  if (!authenticatedUser) {
    return res.status(401).end();
  }

  const recievedPost = req.body;
  const postToAdd = new Post({
    title: recievedPost.title,
    content: recievedPost.content,
    createdAt: new Date(),
    lastModified: new Date(),
    user: authenticatedUser._id,
  });
  const savedPost = await postToAdd.save();
  authenticatedUser.posts = authenticatedUser.posts.concat(savedPost._id);
  await authenticatedUser.save();
  await savedPost.populate("user", "username name").execPopulate();

  res.status(201).json(savedPost);
});

postsRouter.delete("/:id", async (req, res, next) => {
  const authenticatedUser = req.user;
  if (!authenticatedUser) {
    return res.status(401).end();
  }

  const postToDeleteFromDb = await Post.findOne({
    _id: req.params.id,
    user: authenticatedUser._id,
  });
  if (!postToDeleteFromDb) {
    return res.status(404).end();
  }

  const removedPost = await postToDeleteFromDb.remove();
  authenticatedUser.posts = authenticatedUser.posts.filter(
    (postId) => postId.toString() !== removedPost._id.toString()
  );
  await authenticatedUser.save();

  res.status(204).end();
});

postsRouter.put("/:id", async (req, res, next) => {
  const authenticatedUser = req.user;
  if (!authenticatedUser) {
    return res.status(401).end();
  }

  const recievedPost = req.body;
  const changedPost = {
    title: recievedPost.title,
    content: recievedPost.content,
    lastModified: new Date(),
  };
  const updatedPost = await Post.findOneAndUpdate(
    { _id: req.params.id, user: authenticatedUser._id },
    changedPost,
    {
      new: true,
      runValidators: true,
    }
  ).populate("user", "username name");

  if (!updatedPost) {
    return res.status(404).end();
  }
  res.json(updatedPost);
});

module.exports = postsRouter;
