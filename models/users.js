const mongoose = require('mongoose')
const Schema = mongoose.Schema

const user = new Schema({
  name: String,
  tag: String,
  username: String,
  password: String,
  token: String,
  ip: String
})

const Users = mongoose.model('user', user)
module.exports = Users
