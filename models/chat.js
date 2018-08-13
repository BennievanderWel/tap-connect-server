const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  users: [{
    type: String
  }],
  isGroup: {
    type: Boolean
  }
})

const Chat = mongosose.model('chat', chatSchema)
module.exports = Chat