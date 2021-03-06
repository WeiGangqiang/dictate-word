const AixBot = require('aixbot');
const Chatbot = require('./chatbot');
const logger = require('./logger').logger('index');

const aixbot = new AixBot();
const dictationBot = new Chatbot('dictation','dictation', 'http://xiaoda.ai/water-drop/qa/');
const indentifyCodeBot = new Chatbot('indentifyCode', 'indentifyCode', 'http://xiaoda.ai/water-drop/qa/');
// const horoscopeBot = new Chatbot('my-horoscope','my-horoscope', 'http://101.132.183.112:6060/query');
const horoscopeBot = new Chatbot('my-horoscope','my-horoscope', 'http://xiaoda.ai/water-drop/qa/');
const luckyNumberBot = new Chatbot('horoscope', 'lucky-number', 'http://xiaoda.ai/water-drop/qa/');
const luckyColorBot = new Chatbot('horoscope', 'lucky-color', 'http://xiaoda.ai/water-drop/qa/');
const huangliBot = new Chatbot('horoscope', 'huangli', 'http://xiaoda.ai/water-drop/qa/');
const dictationDebug = new Chatbot('dictation','dictation', 'http://101.132.183.112:6060/query');
const tossCoinBot = new Chatbot('toss-coin','toss-coin', 'http://xiaoda.ai/water-drop/qa/');
const dinnerDecisionBot = new Chatbot('dinner-decision','dinner-decision', 'http://101.132.183.112:6060/query');
const parrotBot = new Chatbot('parrot','parrot', 'http://xiaoda.ai/water-drop/qa/');

var chatBots = {
    "370643393107197952" : dictationBot,
    "373172495844378624" : dictationDebug,
    "373173041628187648" : dictationBot,
    "373171784578498560" : dictationDebug,
    "370993833464303616" : dictationBot,
    "375371735773478912" : dictationBot,
    "372783328937380864" : indentifyCodeBot,
    "373171041582712832" : indentifyCodeBot,
    "378287272711161856" : horoscopeBot,
    "376718431111613440" : horoscopeBot,
    "376719938448002048" : luckyNumberBot,
    "376719607714547712" : luckyColorBot,
    "376717867380375552" : huangliBot,
    "382177231385920512" : tossCoinBot,
    "381078346424912896" : dinnerDecisionBot,
    "382938508622299136" : parrotBot

}

// define middleware for response time
aixbot.use(async (ctx, next) => {
    console.log(`receive from app: ${ctx.request.appId} request query: ${ctx.request.query} requestId : ${ctx.request.requestId}`);
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
            var response = ctx.directiveTts(res.reply)
            var isQuitSkill = false
            for(var index in res.data ){
                var item = res.data[index]
                if(item.type === "play-audio") {
                    response.directiveAudio(item['audio-url'])
                }
                if(item.type === "text") {
                    response.directiveTts(item['reply'])
                }
                if(item.type === "quit-skill") {
                    isQuitSkill = true
                }
            }
            if(isQuitSkill){
                return response.closeSession();
            }else {
                return response.wait()
            }
        }
        let ret = ctx.query(res.reply);
        console.log(`the reply is ${JSON.stringify(ret)}`);
        return ret;
    };
    ctx.replyToText = async () => {
        const appId = ctx.request.appId
        const chatbot = chatBots[appId]
        if(!chatbot){
            ctx.reply("抱歉，没有找到技能").closeSession();
            return 
        }
        await reply(ctx, async () => {return await chatbot.replyToText(ctx.request.user, ctx.request.query)});
    };
    ctx.replyToEvent = async (eventName) => {
        const appId = ctx.request.appId
        const chatbot = chatBots[appId]
        if(!chatbot){
            ctx.reply("抱歉，没有找到技能").closeSession();
            return 
        }
        await reply(ctx, async () => {return await chatbot.replyToEvent(ctx.request.user, eventName + chatbot.getSkillName())});
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