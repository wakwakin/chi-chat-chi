const express = require('express'),
      mongoose = require('mongoose'),
      app = express(),
      https = require('http').createServer(app),
      WebSocket = require('ws'),
      server = new WebSocket.Server({ server: https })

server.on('connection', socket => {
  socket.on('message', message => {
    server.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`${ message }`)
      }
    })
  })
})

app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.use(express.static(__dirname + '/public'))
app.use('/', require('./routes/index'))

mongoose.connect(process.env.DB).then(() => {
  https.listen(process.env.PORT)
})
