'use strict'

const token = 'vk1.a.k0tX4Z1DCA09RgW-m9OIRIDAQA8eZhdlQMVa-WQDZ84g2sUun6F23SxD5owfdgLI11kltP_X4vJU8ZGbQaWNe5UPyBcINZtu0Ye1jRZiY1UQoQlprs5kmGqVfBuUxAkt3A7bOX6JPPmtkCf68z5Pp_2lhEk87jm0I7Ap-tCRAaZtm0MY1k5LSDpaExgR6Iy-';

const VK = require('vk-node-sdk')
const Group = new VK.Group(token) // Подробнее: https://vk.com/dev/access_token
 
Group.onMessage((message) => {
  console.log('new message', message.toJSON())
  message.setTyping() // Отправляем статус "печатает"
  switch(message.body) {
    case 'пинг':
      message.addText('понг').send()
      break
    case 'фото':
      message.addPhoto('https://vk.com/images/gift/875/256_1.jpg').send()
      break
    case 'документ':
      message.addPhoto('http://vk.com/images/gift/875/256.mp4').send()
      break
    case 'ответ':
      message.addText('сообщение').addForward(message.id).send()
      break
  }
})
 
Group.onCommand('/help', (message) => { // Пример использование комманды
  message.addText('Это тестовый бот для проверки библиотеки vk-node-sdk.').send()
})