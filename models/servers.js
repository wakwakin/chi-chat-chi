const mongoose = require('mongoose')
const Schema = mongoose.Schema

const server = new Schema({
  creator: String,
  name: String,
  link: String,
  roles: String,
  channel: String,
  members: String,
  messages: String
})

const Servers = mongoose.model('server', server)
module.exports = Servers
