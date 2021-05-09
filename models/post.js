const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, minLength: 3 },
  content: { type: String, required: true, minLength: 3 },
  createdAt: { type: Date, required: true },
  lastModified: { type: Date, required: true },
  comments: [{ content: { type: String, reqired: true }, date: Date }],
  reactions: {
    thumbsUp: { type: Number, default: 0 },
    hooray: { type: Number, default: 0 },
    heart: { type: Number, default: 0 },
    rocket: { type: Number, default: 0 },
    eyes: { type: Number, default: 0 },
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});
postSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
