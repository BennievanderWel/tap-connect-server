const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  chatId: {
    type: String
  },
  userId: {
    type: String
  },
  content: {
    type: String
  }
})

const Message = mongoose('message', messageSchema)
module.exports = Message