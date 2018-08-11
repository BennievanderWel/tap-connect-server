// Init dotenv first to get access .env variable on process.env
const dotenv = require('dotenv');
dotenv.config();

// Import packages
const mongoose = require('mongoose');
const { ApolloServer, gql } = require('apollo-server-express');
const User = require('./models/user');
const bcrypt = require('bcryptjs');
const express = require('express');
const authRouter = require('./routes/auth');
const bodyParser = require('body-parser');
const JWT = require('jsonwebtoken');

// Connect to DB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.once('open', () => console.log('Connected to DB'))
db.on('error', error => console.log('DB connection error:', error));

//  Setup typeDefs
const typeDefs = gql`
  type User {
    _id: String
    email: String,
    password: String,
    tokens: [String]
  }

  type Query {
    """
    Get all users
    """
    user(id: Int!): User
    users: [User]
    getCurrentUser: User
  }

  type Mutation {
    """
    Create a new user
    """
    createUser(email: String, password: String): User
    loginUser(email: String, password: String): String
  }
`;

// Setup resolvers
const resolvers = {
  Query: {
    user: (root, { id }) => User.findById(id).then(user => user),
    users: () => User.find().then(users => users),
    getCurrentUser: (root, args, context) => {
      return context.user;
    }
  },
  Mutation: {
    createUser: (root, { email, password }) => {
      return User.createUser(email, password).then(user => user);
    },
    loginUser: async (root, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('No iser found')
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new Error('Not a valid password')
      }

      const token = await user.generateAuthToken();

      return token;
    }
  }
}

// Create apollo
const apolloServer = new ApolloServer({ 
  typeDefs, 
  resolvers,
  playground: { settings: { 'editor.theme': 'light' }},
  context: ({ req }) => ({ user: req.user })
});

// Create express server
const expressServer = express();
expressServer.use(bodyParser.urlencoded({ extended: false }))
expressServer.use(bodyParser.json())
expressServer.use('/auth', authRouter);

// Make the graphql route protected
expressServer.all('/grapql', (req, res, next) => {
  // Get the token fromt the request
  const token = req.headers['authorization'];
  
  // Process token
  if (token) {
      // Verify the token
      JWT.verify(token, process.env.SECRET_KEY, (err, data) => {
        if (!err) {
          // If the token is valid, fetch the user object and 
          // place it on the request
          User.findOne({ _id: data.userId }, (err, user) => {
            req.user = user.toJSON();
            next();
          });
        } else {
          // On invalid token
          res.status(401).json({ msg: 'Invalid token' });
        }
    });
  } else {
    // On no token found
    res.status(401).json({ msg: 'No token provided' });
  }
});

// Connect the apolloServer to the expressServer
apolloServer.applyMiddleware({ app: expressServer, path: '/grapql' });

// Run server
expressServer.listen({ port: process.env.PORT }, () => {
  console.log(`Server running on port ${process.env.PORT}`)
});