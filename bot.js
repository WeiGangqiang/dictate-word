const AixBot = require('aixbot');
const logger = require('./logger').logger('index');

const aixbot = new AixBot();

var index = 0

// define middleware for response time
aixbot.use(async (ctx, next) => {
    console.log(`process request for '${ctx.request.query}' ...`);
    var start = new Date().getTime();
    await next();
    var execTime = new Date().getTime() - start;
    console.log(`... response in duration ${execTime}ms`);
});

// define middleware for DB
aixbot.use(async (ctx, next) => {
    ctx.words = [
        "波浪","浪花","海浪","灯光","电灯","作文","工作"
    ]
    await next();
});

// define event handler
aixbot.onEvent('enterSkill', (ctx) => {
    ctx.speak('现在开始默写今天的单词吧， 你准备好了吗').wait();
});

// define text handler
aixbot.hears(/(好的)|(好了)|(行)|(可以)|(好)/, (ctx) => {
    ctx.curWord = ctx.words[index]
    index = (index + 1) % ctx.words.length
    ctx.speak(`${ctx.curWord}`).wait();
});

// define text handler
aixbot.hears(/(下一个)|(换一个)|(写完了)|(换)|(再换)|(写好了)|(再换一个)|(再下一个)/, (ctx) => {
    ctx.curWord = ctx.words[index]
    index = (index + 1) % ctx.words.length
    ctx.speak(`${ctx.curWord}`).wait();
});

aixbot.onEvent('noResponse', async (ctx) =>{
    ctx.directiveAudio("http://xiaoda.ai/audios/audio?name=05").wait();
    // ctx.speak("写完了对我说下一个").wait();
});

// define text handler
aixbot.hears(/(退出)|(不写了)|(退出)|(离开)|(休息)/, (ctx) => {
    ctx.reply('再见').closeSession();
});

// close session
aixbot.onEvent('quitSkill', (ctx) => {
    ctx.reply('再见').closeSession();
});

// define error handler
aixbot.onError((err, ctx) => {
    logger.error(`error occurred: ${err}`);
    ctx.reply('内部错误，稍后再试').closeSession();
});

logger.info("start run on 8090")
aixbot.run(8090);