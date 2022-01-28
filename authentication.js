// Development only require
// require('dotenv').config() // Comment when trying to launch

const express = require('express'),
      router = express.Router(), // Use the router of express
      cookieParser = require('cookie-parser'), // Get cookies
      jwt = require('jsonwebtoken') // Token

router.use(cookieParser()) // Use the dependency

function verifyToken(req, res, next) {
  try {
    const cookies = req.headers.cookie,
          splitCookies = cookies.split('=')
    let token = splitCookies[1].trim()
    // for (i = 0; i < splitCookies.length; i++) {
    //   const authorization = splitCookies[i].split('=')
    //   if (authorization[0].trim() == 'authorization') { // If the cookie has authorization
    //     token = authorization[1].trim() // Set the token with the value of the authorization value
    //   }
    // }
    if (token == null) return res.render('index', {
      user: false
    }) // If token is null, go to login page
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        return res.render('index', {
          user: false
        }) // If verification of jwt encountered error, go to login page
      }
      req.user = user // If the verification doesnt encounter any error, set the req.user as user
      next()
    })
  } catch(e) {
    console.log('catch: ' + e)
    res.redirect('/')
  }
}

module.exports = verifyToken
