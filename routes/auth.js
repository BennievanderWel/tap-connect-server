const router = require('express').Router();
const JWT = require('jsonwebtoken');
const User = require('./../models/user');

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  User.findOne({ email }, 'email password _id', (err, user) => {
    if (user) {
      if (user.verifyPassword(password)) {
        const token = user.generateAuthToken();
        res.json({ token });
      } else {
        res.status(400).json({ msg: 'Invalid credentials' });
      }
    } else {
      res.status(400).json({ msg: 'Invalid credentials' });
    }
  });
});

router.post('/logout', (req, res) => {

});

module.exports = router;