const mongoose = require('mongoose');
const validator = require('validator');
const JWT = require('jsonwebtoken');
const enums = require('./enums');
const  bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email'
    }
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  tokens: [{
      type: String,
      required: true
  }],
  roles: [{
      type: String,
      required: true,
      validate: {
        validator: value => Object.keys(enums.UserRoles).includes(value),
        message: '{VALUE} is not a valid user role'
      }
  }]  
});

// =============
// Class methods
// =============

/**
 * Find a user based on an access token
 * @param {String} token The access token to find the user by 
 * @returns {Promise} Will resolve with a user object
 */
userSchema.statics.findByToken = function(token) {
  const User = this;

  return User.findOne({ 
    _id: JWT.verify(token, 'adfaasfda'),
    tokens: token
  });
};

/**
 * If user is an admin, create a new user
 * @param {String} email The email adress of the new user
 * @param {String} password The raw password of the new user
 * @returns {Promise} Will resolve with a user object
 */
userSchema.statics.createUser = function( email, password, requestingUser ) {
  if (User.isAdmin()) {
    return bcrypt.hash(password, 12).then(hash => {
      return new User({ email, password: hash, roles: [enums.UserRoles.MEMBER] }).save()
    });
  } else {
    return new Promise.reject('You are not allowed to execute this action')
  }  
};

// ================
// Instance methods
// ================

/**
 * Generate an authentication token based on the user and add to 
 * the user tokens
 */
userSchema.methods.generateAuthToken = function() {

  // TODO: Set expiration time on token and figure out what the 
  // TODO: best solution ins wrt refeshing a token

  const user = this;
  console.log(user)
  return JWT.sign(
    { userId: user._id }, 
    process.env.SECRET_KEY
  );
};

userSchema.methods.verifyPassword = function(password) {
  const user = this;

  return bcrypt.compare(password, user.password);
};

/**
 * Check if the user is an admin
 */
userSchema.methods.isAdmin = function() {
  return this.roles.includes(enums.UserRoles.ADMIN);
}

// Export User
const User = mongoose.model('user', userSchema);
module.exports = User;