require("dotenv").config();

const DB_URL =
  process.env.NODE_ENV === "production"
    ? process.env.DB_URL
    : process.env.TEST_DB_URL;

const PORT = process.env.PORT || 3001;

module.exports = {
  DB_URL,
  PORT,
};
