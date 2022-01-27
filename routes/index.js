const express = require('express'),
      router = express.Router(),
      bcrypt = require('bcrypt'),
      jwt = require('jsonwebtoken'),
      hash = require('shorthash'),
      auth = require('../authentication'),
      Users = require('../models/users'),
      Servers = require('../models/servers')

router.use(express.urlencoded({ extended: false }))
router.use(express.json())

router.get('/', (req, res) => {
  try {
    const cookie = req.headers.cookie, // Get cookie
          splitCookie = cookie.split(';') // Split the cookie by ;
    let token = ''
    for (i = 0; i < splitCookie.length; i++) {
      const authorization = splitCookie[i].split('=')
      if (authorization[0].trim() == 'authorization') { // If the cookie has authorization
        token = authorization[1].trim() // Set the token with the value of the authorization value
      }
    }
    if (token == null) {
      return res.render('index', {
        user: false
      }) // If token is null, go to login page
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        return res.render('index', {
          user: false
        })
      } // If verification of jwt encountered error, go to login page
      req.user = user // If the verification doesnt encounter any error, set the req.user as user
      return res.render('index', {
        user: true
      })
    })
  } catch {
    res.render('index', {
      user: false
    })
  }
})
router.post('/', async (req, res) => {
  if (req.body.username.length < 1 || req.body.password.length < 1) {
    return res.send({
      user: false
    })
  }

  await Users.findOne({
    username: req.body.username
  }).then(async user => {
    if (!user) {
      return res.send({
        user: false
      })
    }

    const id = user._id.toString()
    await bcrypt.compare(req.body.password, user.password, async (error, response) => {
      if (!response) {
        return res.send({
          user: false
        })
      }

      const token = jwt.sign({
        username: req.body.username,
      }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })

      await Users.findOneAndUpdate({
        username: req.body.username
      }, {
        token: token
      })

      res.json({
        success: true,
        token: token,
        user: user
      })
    })
  })
})
router.get('/index', auth, async (req, res) => {
  await Users.findOne({
    username: req.user.username
  }).then(async user => {
    await Users.findOneAndUpdate({
      username: req.user.username
    }, {
      ip: req.ip
    })

    if (user) {
      return res.render('index', {
        user: true,
        uid: user._id.toString(),
        name: user.name,
        tag: user.tag,
        username: user.username
      })
    }

    return res.redirect('/')
  }).catch(err => {
    res.clearCookie('authorization')
    return res.redirect('/')
  })
})
router.post('/logout', auth, async (req, res) => {
  await Users.findOneAndUpdate({
    _id: req.body.uid
  }, {
    token: ''
  })

  res.send('Done')
})
router.post('/register', async (req, res) => {
  if (req.body.username.length < 1 || req.body.password.length < 1) {
    return res.send({
      user: false
    })
  }

  if (req.body.username.length > 0 && req.body.username.length < 15 &&
      req.body.password.length > 0) {
        await Users.findOne({
          username: req.body.username
        }).then(async user => {
          if (user) {
            return res.send({
              user: false
            })
          }

          const password = await bcrypt.hash(req.body.password, 10).then(async thisPassword => {
            let tag = parseInt(Math.random() * 9999)
            if (tag < 1000) tag = '0' + tag
            else if (tag < 100) tag = '00' + tag
            else if (tag < 10) tag = '000' + tag
            const newUser = new Users({
              name: req.body.username,
              tag: tag,
              username: req.body.username,
              password: thisPassword
            })

            await newUser.save()

            return res.send({
              user: true
            })
          })
        })
      }
})
router.post('/update', auth, async (req, res) => {
  if (req.body.tag.length > 4 || isNaN(req.body.tag)) {
    return res.send({
      update: false
    })
  }
  await Users.findOne({
    _id: req.body.uid,
  }).then(async user => {
    if (!user) {
      return res.send({
        update: false
      })
    }

    await bcrypt.compare(req.body.password, user.password, async (err, response) => {
      if (!response) {
        return res.send({
          update: false
        })
      }

      await Users.findOneAndUpdate({
        _id: req.body.uid
      }, {
        name: req.body.name,
        tag: req.body.tag
      })

      return res.send({
        update: true
      })
    })
  })
})
router.get('/user', auth, async (req, res) => {
  await Users.findOne({
    username: req.user.username
  }).then(user => {
    res.send({
      utn: user.name,
      utg: user.tag,
      usn: user.username,
      uid: user._id.toString()
    })
  })
})
router.post('/server', auth, async (req, res) => {
  const info = []
  await Servers.find().then(servers => {
    for (i = 0; i < servers.length; i++) {
      const members = [],
            split = servers[i].members.split(';')
      for (j = 0; j < (split.length - 1); j++) {
        members.push(split[j])
      }
      if (members.indexOf(req.user.username) > -1) {
        info.push({
          creator: servers[i].creator,
          name: servers[i].name,
          link: servers[i].link,
          roles: servers[i].roles,
          channel: servers[i].channel,
          members: members,
          id: servers[i]._id.toString()
        })
      }
    }

    return res.send(info)
  })
})
router.post('/server/join', auth, async (req, res) => {
  await Servers.findOne({
    link: req.body.link
  }).then(async server => {
    console.log(server)
    await Users.findOne({
      _id: req.body.uid
    }).then(async user => {
      if (server.members.contains(user.username)) {
        return res.send({
          join: false
        })
      }
      const members = server.members + user.username + ';'
      await Servers.findOneAndUpdate({
        link: req.body.link
      }, {
        members: members
      })

      return res.send({
        join: true
      })
    })
  }).catch(() => {
    return res.send({
      join: false
    })
  })
})
router.post('/server/create', auth, async (req, res) => {
  if (req.body.name.length < 1 || req.body.name.length > 15) {
    return res.send({
      server: false
    })
  }

  await Users.findOne({
    _id: req.body.creator
  }).then(async user => {
    const link = await hash.unique(Date.now().toString() + 'server')
    const newServer = new Servers({
      creator: user.username,
      name: req.body.name,
      link: link,
      roles: '',
      channel: '',
      members: user.username + ';',
      messages: ''
    })

    await newServer.save()

    return res.send({
      server: true
    })
  })
})
router.post('/message', auth, async (req, res) => {
  const info = []
  await Servers.findOne({
    _id: req.body.target
  }).then(async server => {
    if (server.messages != '') {
      let split = server.messages.split(';'),
          total = (split.length - 2) - 20

      if ((split.length - 2) < 10) total = -1

      for (i = (split.length - 2); i > total ; i--) {
        const data = split[i].split(':')
        await Users.findOne({
          _id: data[0]
        }).then(user => {
          info.push({
            sender: user.name,
            message: data[1]
          })
        })
      }
    }
    return res.send(info)
  }).catch((e) => {
    console.log(e)
    return res.send({
      message: false
    })
  })
})
router.post('/message/create', auth, async (req, res) => {
  if (req.body.message.length < 1) {
    return res.send({
      message: false
    })
  }
  if (req.body.target == '') {
    return res.send({
      message: false
    })
  }
  await Servers.findOne({
    _id: req.body.target
  }).then(async server => {
    let message = server.messages + req.body.uid + ':' + req.body.message + ';'
    await Servers.findOneAndUpdate({
      _id: req.body.target
    }, {
      messages: message
    })

    return res.send({
      message: true
    })
  }).catch(() => {
    return res.send({
      message: false
    })
  })
})

router.get('*', (req, res) => {
  res.redirect('/')
})
module.exports = router
