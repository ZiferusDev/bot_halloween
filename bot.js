'use strict'

// -----------------------------------------------------DB--------------------------------------------------

const dbadress = "";
    const mongoose = require('mongoose');
    const User = require("./Scheme/User");
    const MongoClient = require("mongodb");
    // const client = new MongoClient("адрес бд");
    // client.db().createCollection/insertOne/findOne() etc
    
    mongoose
.connect(dbadress, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
})    
    .then(() => console.log("mongodb merch-base connect"))
    .catch(err => console.error(err));

// -----------------------------------------------------GUIDE--------------------------------------------------

// User.find({id: ctx.message.from_id}).then(result => {
//     if(res[0] == undefined) {
//         const currentUser = new User({
//             name: "pidrila" ,
//             surname: "sexovich",
//             id: Ilya_ID,
//         });
//     currentUser.save().catch(e => {
//         console.log(e);
//     }).then(r => {
//         ctx.reply("Пошол нахуй, ты не участвуеш \n изи скам");
//     })
//     } else {
//         ctx.reply("Ещё деньги приму, но уже просто так, ты уже есть в БД");
//     }
// });

// // Ещё возможности

// User.find({id: ctx.message.from_id}).then(result => { // обновить inf

// });

// --------------------------------------ADMIN_SETTINGS----------------------------------------------------------- 

const Activation_Time = new Date(2022, 8, 29, 16, 45, 0, 0); // Время активации бота
// const token = 'vk1.a.OLjk1p-7yy9pwMYIYmAS-icJOnpZvCw9kazWTMY5tksUywQRhHN1c1zbnTZn_NhIM7enKn5F_Ax4UMRUSy0zIT8ZK-CEaMhY6ltAu_-q14Dba37mZl5AGsYMDTgTgz29H9xkoayFlFagE0l_ZdPWVT9eP68vPpFgKbUrbcHFg1B5wHN0mtYW3XAR-lUnYOg2';
const token_test = 'vk1.a.k0tX4Z1DCA09RgW-m9OIRIDAQA8eZhdlQMVa-WQDZ84g2sUun6F23SxD5owfdgLI11kltP_X4vJU8ZGbQaWNe5UPyBcINZtu0Ye1jRZiY1UQoQlprs5kmGqVfBuUxAkt3A7bOX6JPPmtkCf68z5Pp_2lhEk87jm0I7Ap-tCRAaZtm0MY1k5LSDpaExgR6Iy-';


const Igor_ID = 239146759;
const Ilya_ID = 146966175;
const Elena_Kozlova = 176918752;

let admins = [Igor_ID, Ilya_ID, Elena_Kozlova];

const groupID = -194237727; // "Я подозреваю Всё"

let members = [];
members[0] = {
    id: Igor_ID,
};


const Requisites = '+7123456789';
const delay = 10000; // 300 тысяч миллисекунд = 5 минут
// Функции для обращения ко всем участникам

// Рассылка сообщений циклом // ctx.message.from_id
const massMessage = (message) => {
    for (let i = 0; i < members.length; i++) {
        // console.log(members[i].id);
        try{
            bot.sendMessage(members[i].id, message);        
        }
        finally{
            continue;
        }
    }
}

// --------------------------------------ADMIN_SETTINGS----------------------------------------------------------- //

// Работа с участниками 

class Participant { // участник
    constructor(name, secondName, vkID, paymentStatus) {
        this.name = name;
        this.secondName = secondName;
        this.vkID = vkID;
        this.paymentStatus = paymentStatus;
    };
};

const addNewParticipant = (name, vkID) => {
    let userInfo = name.split(' ');
    userInfo.push(vkID);
    // console.log(userInfo);
}

function findCurrentParticipant(vkID) {
    // Нахожу вот тут в БД этого чувака и вот так
    return 'Путь к чуваку в базе данных'
};

function changeParticipantObject(currentParticipant, property, value) {
    currentParticipant.property = value;
}

let TheParticipant = new Participant('', '', '', false);

let userTest = new Participant("Игорь", "Пепегин", Igor_ID, 1);


let request = new URL(`https://api.vk.com/method/messages.getHistory?&count=1&peer_id=239146759&access_token=vk1.a.k0tX4Z1DCA09RgW-m9OIRIDAQA8eZhdlQMVa-WQDZ84g2sUun6F23SxD5owfdgLI11kltP_X4vJU8ZGbQaWNe5UPyBcINZtu0Ye1jRZiY1UQoQlprs5kmGqVfBuUxAkt3A7bOX6JPPmtkCf68z5Pp_2lhEk87jm0I7Ap-tCRAaZtm0MY1k5LSDpaExgR6Iy-&v=5.131`);

var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;


async function confirmationWithLastMessage() {
    async function confirmation () {
        let answer = await JSON.parse(req.responseText);
        let textInLastMessage = answer.response.items[0].text;
        // console.log(req.responseText);
        let senderID = answer.response.items[0].from_id;
        if (senderID === groupID) {
            if (textInLastMessage.toLowerCase().includes("подтвердить")) {
                await console.log("Ееее боиии")
                TheParticipant.paymentStatus = true;
                await req.abort();
            } else { 
                console.log("Последнее сообщение от сообщества не подтверждает платёж");
                console.log("\nСообщение: \n" + '"' + textInLastMessage + '"');
                return 0;
            }
        } else {
            console.log("Последнее сообщение отправлено не от лица сообщества")
            return 0;
        }
    }
    let isConfirmed = false;
    const req = new XMLHttpRequest();
    req.addEventListener("load", confirmation);
    req.open("GET", request);
    req.send();
    return isConfirmed;
}

const checkPaymentStatus = async () => {
    if (TheParticipant.paymentStatus === true) return 1
    else return 0;
}

const confirmationLoop = async () => {
    const checkingToLoop = () => {setTimeout(async () => {
            if (checkPaymentStatus) return 1
            else return 0;
        }, delay);
    }
    console.log(checkingToLoop());
    do {
        await confirmationWithLastMessage();
        console.log("Проверяю");
    } while (await !checkingToLoop);
}
// JS sleep в while 
confirmationLoop();

// confirmationWithLastMessage();

// console.log(TheParticipant.paymentStatus);

const VkBot = require('node-vk-bot-api');
const Scene = require('node-vk-bot-api/lib/scene');
const Session = require('node-vk-bot-api/lib/session');
const Stage = require('node-vk-bot-api/lib/stage');
const Markup = require('node-vk-bot-api/lib/markup');
const { find } = require('./Scheme/User');

const bot = new VkBot(token_test);

const session = new Session();

bot.use(session.middleware());


const scene_Halloween = new Scene('Хеллоуин', 
    async (ctx) => {
        ctx.scene.next();
        await ctx.reply(`Добро пожаловать на Halloween! 👻
        В прохождении регистрации вам посодействует бот-помощник.
        Именно он и определит, кто станет победителем лотереи! \n\n
        Чтобы начать регистрацию на лотерею, необходимо купить лотерейный билет c: (50 рублей)`, null, Markup
        .keyboard([   
            [
                Markup.button('Оплатить билет', 'positive'),
            ],
            [
                Markup.button('Батя в здании', "primary"),
            ],
        ])
        );
    },
    async (ctx) => {
        switch (ctx.message.text.toLowerCase()) {
            case "оплатить билет":
                ctx.scene.next();
                ctx.reply(`Реквизиты "${Requisites}" \n
                Теперь от тебя понадобится скриншот с чеком об оплате. Я проверю 🤓
                `);
                break;
            case "батя в здании":
                if((ctx.message.from_id === Igor_ID) || (ctx.message.from_id === Ilya_ID)) {
                    ctx.scene.leave();
                    ctx.scene.enter("Батя в здании");
                }
                else {
                    ctx.reply("У вас нет доступа к этой команде");
                }
                break;
            default: 
                ctx.reply("Я не понял, платить будеш, нет? 😡");
        }
    },
    async (ctx) => {
        ctx.reply("Обрабатываю. \n Пожалуйста, ожидай моего ответа и не отправляй новых сообщений. Заранее спасибо :3");
        confirmationLoop();
    },
    async (ctx) => {
        ctx.scene.next();
        await bot.sendMessage(ctx.message.from_id, 'Введите через пробел свои имя и фамилию, заранее проверьте точность введённых данных');
    },
);

const scene_Admin = new Scene("Батя в здании", // Сценарий админов
    async (ctx) => {
        await ctx.reply('Здравствуй, папа', "photo409326303_457239373", Markup
        .keyboard([   
            [
                Markup.button('Сообщение всем', 'primary'),
                Markup.button('Ещё какая-то кнопка', 'primary'),
                Markup.button("Отправь запрос", "positive"),
            ],
            [
                Markup.button('Как настроение?', 'positive'),
            ],
            [
                Markup.button("Покинуть admin-menu", "negative" ), 
            ],
        ])
        );
        await ctx.scene.next();
    },
    async (ctx) => {
        switch(ctx.message.text.toLowerCase()) {
            case "сообщение всем":
                ctx.scene.leave();
                ctx.scene.enter("Сообщение всем");
                break; 
            case "отправь запрос": 
                // setTimeout(func = () => {
                //     confirmationWithLastMessage();
                // }, delay);
                console.log(confirmationWithLastMessage());
                // if(*) {
                //     bot.sendMessage(ctx.message.from_id, "Оплата подтверждена, двигаемся к регистрации");
                //     ctx.scene.next();
                // } else {
                //     console.log("\n Что-то пошло не так");
                // };
                break;
            case "как настроение?": 
                await ctx.reply("", "video174550193_456239109");
                bot.sendMessage(ctx.message.from_id, "Это люба говорит");
            case "покинуть admin-menu":
                ctx.reply("Но это не отменяет того факта, что ты - мой папа ❤", null, Markup
                .keyboard ([
                ])
                );
                ctx.scene.leave();
                break;
            default: 
                ctx.reply("Не нашёл такой команды 🤨", null, Markup
                .keyboard([   
                    [
                        Markup.button('Сообщение всем', 'primary'),
                        Markup.button('Ещё какая-то кнопка', 'primary'),
                    ],
                    [
                        Markup.button('Как настроение?', 'positive'),
                    ],
                    [
                        Markup.button("Покинуть admin-menu", "negative" ), 
                    ],
                ])
                );
        }
    }
);

const scene_MassMessage = new Scene("Сообщение всем",
async (ctx) => {
    switch(ctx.message.text.toLowerCase()) {
        case "сообщение всем":
                ctx.scene.next();
                await ctx.reply('Следующее сообщение, отправленное тобой, будет выведено всем первокурсникам', null, Markup 
                .keyboard([
                    [
                    Markup.button('Отмена', 'negative'),
                    ],
                ])
                .oneTime(),
                );
                break;
        default: 
            ctx.reply("Не нашёл такой команды");
    }
},
async (ctx) => {
    if (ctx.message.text.toLowerCase() === 'отмена'){
        ctx.reply("Функция рассылки сообщения всем отменена \n Верну в начало менюшки");
        ctx.scene.leave();
        ctx.scene.enter("Батя в здании");
    }
    else {
    ctx.scene.next();
    ctx.session.message = ctx.message.text;
    ctx.reply(ctx.session.message + "\n\n Это сообщение будет выведено всем первокурсникам, вы уверенны, что хотите его отправить?", null, Markup
    .keyboard([   
        [
            Markup.button('Да', 'positive'),
            Markup.button('Нет', 'negative'),
        ],
    ])
    .oneTime(),
    );
    }
},
async (ctx) => {
    switch(ctx.message.text.toLowerCase()) {
        case "да": 
        await massMessage(ctx.session.message);
        // await bot.sendMessage(Igor_ID, ctx.session.message);
        await bot.sendMessage([Igor_ID, Ilya_ID], "Сообщение: \" " + ctx.session.message + "\" \n было отправлено");
        await ctx.scene.leave();
        await ctx.scene.enter("Батя в здании");
        break;
        case "нет":
            await ctx.reply("Функция рассылки сообщения всем отменена \n Верну в начало менюшки");
            ctx.scene.leave();
            ctx.scene.enter("Батя в здании");
            break;
        default: 
        ctx.reply("Такой функции нет");
    }
},
);

const stage_wakeUP = new Stage(scene_Halloween, scene_Admin, scene_MassMessage);

bot.use(stage_wakeUP.middleware());

bot.command('Это Илья', (ctx) => {
    ctx.reply('Ооо, братанчик, рад тебя видеть', null, Markup 
    .keyboard([
        Markup.button({
            action: {
                type: 'open_link',
                link: 'https://www.youtube.com/watch?v=jPmQCb9TeVs',
                label: 'Пошол нахуй',
                payload: JSON.stringify({
                    url: 'https://www.youtube.com/watch?v=jPmQCb9TeVs',
                }),
            },
        }),
    ])
    .oneTime(),
    );
});

bot.command('Это Света', (ctx) => {
    ctx.reply('Здравствуй, дорогая, рад тебя видеть!', null, Markup 
    .keyboard([
        Markup.button({
            action: {
                type: 'open_link',
                link: 'https://www.youtube.com/watch?v=_tlfnMKrDmA',
                label: 'И тебе привет',
                payload: JSON.stringify({
                    url: 'https://www.youtube.com/watch?v=_tlfnMKrDmA',
                }),
            },
        }),
    ])
    .oneTime(),
    );
});

bot.command('Можно ебать', async (ctx) => ctx.scene.enter('Хеллоуин'));

bot.command('Усни, чорт', async (ctx) => {
    await ctx.reply('Чао');
    console.log("Перекусила");
    bot.stop();
});

bot.command('', async (ctx) => { // Активация бота после начала мероприятия
        if (new Date() > Activation_Time) {
        await ctx.scene.enter('Хеллоуин');
        // bot.sendMessage([Ilya_ID, Igor_ID],'Бот исправно начал работу после назначенного времени: ' + Activation_Time);
        }
        else ctx.reply("Кажется, ночь кошмаров ещё не началась \n Попробуй написать мне чуть позже 🎃");
});

bot.startPolling((err) => {
    if (err) {
        console.log(err);
    }
});

