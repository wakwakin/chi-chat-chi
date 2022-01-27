let socket = new WebSocket(`wss://${ window.location.hostname }:${ window.location.port }`),
    uid = usn = utg = utn = chat_target = ''

socket.onmessage = ({ data }) => {
  try {
    if (uid != '') {
      const message = JSON.parse(data)
      if (message.type == 0) {
        $(`span[link="${ message.link }"]`).text(`[Members: ${ parseInt($(`span[link="${ message.link }"]`).attr('curr')) + 1 }]`)
      } else if (message.type == 1 && chat_target == message.target) {
        $('#message-list div').first().remove()
        $('#message-list').append(`\
          <div>\
            <span>${ message.sender }: ${ message.message }</span>\
          </div>\
        `)
      }
    }
  } catch(error) {
    console.log(data)
  }
}

$('#logout-button').click(function() {
  (function() {
    const cookie = document.cookie.split('; ')
    for (var i = 0; i < cookie.length; i++) {
      const hostname = window.location.hostname.split('.')
      while (hostname.length > 0) {
        const cookieBase = encodeURIComponent(cookie[i].split(';')[0].split("=")[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + hostname.join('.') + ' ;path=',
              pathName = location.pathname.split('/')

        document.cookie = cookieBase + '/'
        while (pathName.length > 0) {
          document.cookie = cookieBase + pathName.join('/')
          pathName.pop()
        }
        hostname.shift()
      }
    }
  })()

  $.ajax({
    url: '/logout',
    method: 'post',
    data: {
      uid: uid
    },
    success: function() {
      window.location.replace('/')
    }
  })
})

function loginUser(username, password) {
  $.ajax({
    url: '/',
    method: 'post',
    data: {
      username: username,
      password: password
    },
    success: function(user) {
      if (user.success) {
        document.cookie = `authorization=${ user.token }`
        window.location.replace('/index')
      } else {
        $('#login-notification').text('User not found or incorrect password')
      }
    }
  })
}
function createUser(username, password) {
  $.ajax({
    url: '/register',
    method: 'post',
    data: {
      username: username,
      password: password
    },
    success: function(user) {
      if (user) {
        $('#register-notification').text('Registration complete')
      } else {
        $('#register-notification').text('Registration failed')
      }
    }
  })
}
function readUser() {
  $.ajax({
    url: '/user',
    method: 'get',
    success: function(user) {
      uid = user.uid
      usn = user.usn,
      utg = user.utg,
      utn = user.utn

      $('#user-logged-in').text(utn + '#' + utg)
      $('#update-name').attr('placeholder', utn)
      $('#update-tag').attr('placeholder', utg)
    }
  })
}
function updateUser(name, tag, password) {
  $('#user-logged-in').text('Updating...')
  $.ajax({
    url: '/update',
    method: 'post',
    data: {
      uid: uid,
      name: name,
      tag: tag,
      password: password
    },
    success: function() {
      readUser()
    }
  })
}
$('#login-button').click(function() {
  event.preventDefault()
  loginUser($('#login-username').val(), $('#login-password').val())
})
$('#register-button').click(function() {
  event.preventDefault()
  createUser($('#register-username').val(), $('#register-password').val())
})
$('#update-button').click(function() {
  event.preventDefault()
  const name = $('#update-name'),
        tag = $('#update-tag'),
        password = $('#update-password-confirm')
  updateUser(name.val(), tag.val(), password.val())
  name.val('')
  password.val('')
})

function createServer(name) {
  $.ajax({
    url: '/server/create',
    method: 'post',
    data: {
      creator: uid,
      name: name
    },
    success: function() {
      readServer()
    }
  })
}
function readServer() {
  $.ajax({
    url: '/server',
    method: 'post',
    data: {
      uid: uid
    },
    success: function(server) {
      $('#server-list').html('')
      for (var i = 0; i < server.length; i++) {
        $('#server-list').append(`\
          <div>\
            <span sid="${ server[i].id }">${ server[i].name }</span>\
            <span link="${ server[i].link }" curr="${ server[i].members.length }">[Members: ${ server[i].members.length }]</span>\
            <span>[Link: ${ server[i].link }]</span>\
          </div>\
        `)
      }
      $('#server-list div span:first-child').click(function() {
        if (chat_target != $(this).attr('sid')) {
          chat_target = $(this).attr('sid')
          readMessage(chat_target)
        }
      })
    }
  })
}
function joinServer(link) {
  $.ajax({
    url: '/server/join',
    method: 'post',
    data: {
      uid: uid,
      link: link
    },
    success: function(s) {
      readServer()

      if (s.join) {
        socket.send(JSON.stringify ({
          type: 0,
          user: utn,
          link: link
        }))
      }
    }
  })
}
$('#create-server-button').click(function() {
  event.preventDefault()
  const name = $('#create-server-name')
  createServer(name.val())
  name.val('')
})
$('#add-server-button').click(function() {
  event.preventDefault()
  const link = $('#add-server-link')
  if (link != '') {
    joinServer(link.val())
    link.val('')
  }
})

function createMessage(message) {
  $.ajax({
    url: '/message/create',
    method: 'post',
    data: {
      target: chat_target,
      message: message,
      uid: uid
    },
    success: function(m) {
      if (m.message) {
        socket.send(JSON.stringify ({
          type: 1,
          sender: utn,
          message: message,
          target: chat_target
        }))
      }
    }
  })
}
function readMessage(target) {
  $('#message-list').html('\
    <div>\
      <span>Loading messages</span>\
    </div>\
  ')
  $.ajax({
    url: '/message',
    method: 'post',
    data: {
      target: target
    },
    success: function(message) {
      $('#message-list').html('')
      for (var i = 0; i < message.length; i++) {
        $('#message-list').append(`\
          <div>\
            <span>${ message[i].sender }: ${ message[i].message }</span>\
          </div>\
        `)
      }
    }
  })
}
$('#message-button').click(function() {
  event.preventDefault()
  const chat = $('#message-text')
  if (chat_target != '' || chat.length > 0) {
    createMessage(chat.val())
    chat.val('')
  }
})
