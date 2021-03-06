const mongoose = require("mongoose")
const validator = require("validator")
const JWT = require("jsonwebtoken")
const enums = require("./enums")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    minlength: 2
  },
  email: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: "{VALUE} is not a valid email"
    }
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  roles: [
    {
      type: String,
      required: true,
      validate: {
        validator: value => Object.keys(enums.UserRoles).includes(value),
        message: "{VALUE} is not a valid user role"
      }
    }
  ],
  friends: [
    {
      type: String,
      required: true
    }
  ]
})

// =============
// Class methods
// =============

/**
 * If user is an admin, create a new user
 * @param {String} email The email adress of the new user
 * @param {String} password The raw password of the new user
 * @returns {Promise} Will resolve with a user object
 */
userSchema.statics.createUser = function(email, password, username, requestingUser) {
  return User.count({ email }).then(count => {
    if (count === 0) {
      if (requestingUser.isAdmin()) {
        return bcrypt.hash(password, 12).then(hash => {
          return new User({
            email,
            password: hash,
            username,
            roles: [enums.UserRoles.MEMBER]
          }).save()
        })
      } else {
        return Promise.reject("You are not allowed to execute this action")
      }
    } else {
      return Promise.reject("Email address already in use")
    }
  })
}

// ================
// Instance methods
// ================

/**
 * Generate an authentication token based on the user and add to
 * the user tokens
 */
userSchema.methods.generateAuthToken = function() {
  // TODO: Set expiration time on token and figure out what the
  // TODO: best solution is wrt refeshing a token

  const user = this

  return JWT.sign(
    {
      data: { userId: user._id }
    },
    process.env.SECRET_KEY
  )
}

userSchema.methods.verifyPassword = function(password) {
  const user = this

  return bcrypt.compare(password, user.password)
}

/**
 * Add a new chat
 * @param {Array} userIds List of ids of the users in the chat
 * @param {String} title The title of the chat if there are
 * more than one user besides the requesting user
 */
userSchema.methods.addChat = function(userIds, title = null) {
  const user = this
}

/**
 * Add a new user id to friends
 * @param {String} email The email of the friend to be added
 */
userSchema.methods.addFriend = function(email) {
  const user = this

  return User.findOne({ email }).then(friend => {
    if (friend) {
      if (!user.friends.includes(friend.id)) {
        user.friends = user.friends.concat(friend.id)

        // Create a chat between the users
        const chat = new chat({ users: [friend.id, user.id] }).save()

        return user.save()
      } else {
        return user
      }
    } else {
      return Promise.reject("No users found for that email")
    }
  })
}

/**
 * Get all the friend user objects
 */
userSchema.methods.getFriends = function() {
  const user = this

  return User.find({ _id: { $in: user.friends } })
}

/**
 * Check if the user is an admin
 */
userSchema.methods.isAdmin = function() {
  return this.roles.includes(enums.UserRoles.ADMIN)
}

// Export User
const User = mongoose.model("user", userSchema)
module.exports = User
