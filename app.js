// Init dotenv first to get access .env variable on process.env
const dotenv = require("dotenv")
dotenv.config()

// Import packages
const mongoose = require("mongoose")
const { ApolloServer, gql } = require("apollo-server-express")
const User = require("./models/user")
const bcrypt = require("bcryptjs")
const express = require("express")
const authRouter = require("./routes/auth")
const bodyParser = require("body-parser")
const JWT = require("jsonwebtoken")
var cors = require("cors")

// Connect to DB
mongoose.connect(
  process.env.MONGO_URI,
  { useNewUrlParser: true }
)
mongoose.Promise = global.Promise
var db = mongoose.connection
db.once("open", () => console.log("Connected to DB"))
db.on("error", error => console.log("DB connection error:", error))

// TODO: Move graphql typedefs and resolvers to their own dedicated files

//  Setup typeDefs
const typeDefs = gql`
  type User {
    _id: String
    email: String
    friends: [String]
    username: String
  }

  type Query {
    """
    Get all the user's chat friends
    """
    getFriends: [User]
    getUser: User
  }

  type Mutation {
    """
    Create a new user
    """
    createUser(email: String, password: String, username: String): User
    addFriend(email: String): User
  }
`

// Setup resolvers
const resolvers = {
  Query: {
    getFriends: (root, args, { user }) => user.getFriends(),
    getUser: (root, args, { user }) =>
      User.findOne({ _id: user.id }, (err, user) => {
        return user
      })
  },
  Mutation: {
    createUser: async (root, { email, password, username }, { user }) => {
      return User.createUser(email, password, username, user)
    },
    addFriend: (root, { email }, context) => {
      return context.user.addFriend(email)
    }
  }
}

// Create apollo
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  playground: { settings: { "editor.theme": "light" } },
  context: ({ req }) => ({ user: req.user })
})

// Create express server
const expressServer = express()
expressServer.use(cors())
expressServer.use(bodyParser.urlencoded({ extended: false }))
expressServer.use(bodyParser.json())
expressServer.use("/auth", authRouter)

// Make the graphql route protected
expressServer.all("/grapql", (req, res, next) => {
  // Get the token fromt the request
  const token = req.headers["authorization"]

  // Process token
  if (token) {
    // Verify the token
    JWT.verify(token, process.env.SECRET_KEY, (err, data) => {
      if (!err) {
        // If the token is valid, fetch the user object and
        // place it on the request
        User.findOne({ _id: data.data.userId }, (err, user) => {
          req.user = user
          next()
        })
      } else {
        // On invalid token
        res.status(401).json({ msg: "Invalid token", err })
      }
    })
  } else {
    // On no token found
    res.status(401).json({ msg: "No token provided" })
  }
})

// Connect the apolloServer to the expressServer
apolloServer.applyMiddleware({ app: expressServer, path: "/grapql" })

// Run server
expressServer.listen({ port: process.env.PORT }, () => {
  console.log(`Server running on port ${process.env.PORT}`)
})
