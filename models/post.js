const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, minLength: 3 },
  content: { type: String, required: true, minLength: 3 },
  createdAt: { type: Date, required: true },
  lastModified: { type: Date, required: true },
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
