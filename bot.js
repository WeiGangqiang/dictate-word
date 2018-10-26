const AixBot = require('aixbot');
const Chatbot = require('./chatbot');
const logger = require('./logger').logger('index');

const aixbot = new AixBot();
const dictationBot = new Chatbot('dictation', 'http://101.132.183.112/chatbotv1/query');
const indentifyCodeBot = new Chatbot('indentifyCode', 'http://101.132.183.112/chatbotv1/query');

var chatBots = {
    "370643393107197952" : dictationBot,
    "373172495844378624" : dictationBot,
    "373173041628187648" : dictationBot,
    "373171784578498560" : dictationBot,
    "370993833464303616" : dictationBot,
    "372783328937380864" : indentifyCodeBot,
    "373171041582712832" : indentifyCodeBot
}

function getAppId(ctx){
    return ctx.req.session.application.app_id
}

// define middleware for response time
aixbot.use(async (ctx, next) => {
    console.log(`process request for '${ctx.request.query}' ... ${getAppId(ctx)}`);
    var start = new Date().getTime();
    await next();
    var execTime = new Date().getTime() - start;
    console.log(`... response in duration ${execTime}ms`);
});

// define middleware for DB
aixbot.use(async (ctx, next) => {
    const reply = async (ctx, getResponse) => {
        const res = await getResponse();
        if (res.data && res.data.length > 0) {
            if (res.data[0].type === 'quit-skill') return ctx.reply(res.reply).closeSession();
        }
        let ret = ctx.query(res.reply);
        console.log(`the reply is ${JSON.stringify(ret)}`);
        return ret;
    };
    ctx.replyToText = async () => {
        const appId = getAppId(ctx)
        const chatbot = chatBots[appId]
        if(!chatbot){
            ctx.reply("抱歉，没有找到技能").closeSession();
            return 
        }
        await reply(ctx, async () => {return await chatbot.replyToText(ctx.request.user, ctx.request.query)});
    };
    ctx.replyToEvent = async (eventName) => {
        const appId = getAppId(ctx)
        const chatbot = chatBots[appId]
        if(!chatbot){
            ctx.reply("抱歉，没有找到技能").closeSession();
            return 
        }
        await reply(ctx, async () => {return await chatbot.replyToEvent(ctx.request.user, eventName + chatbot.getAgent())});
    };
    await next();
});

aixbot.onEvent('noResponse', async (ctx) =>{
    await ctx.replyToEvent('no-response-');
});

aixbot.onEvent('enterSkill', async (ctx) => {
    await ctx.replyToEvent('open-skill-');
});

aixbot.onEvent('quitSkill', async (ctx) => {
    await ctx.replyToEvent('quit-skill-');
});

aixbot.onEvent('inSkill', async (ctx) => {
    await ctx.replyToText();
});

// define error handler
aixbot.onError((err, ctx) => {
    logger.error(`error occurred: ${err}`);
    ctx.reply('内部错误，稍后再试').closeSession();
});

logger.info("start run on 8090")
aixbot.run(8090);