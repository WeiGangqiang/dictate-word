const AixBot = require('aixbot');
const Chatbot = require('./chatbot');
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
    const chatbot = new Chatbot('dictation', 'http://101.132.183.112/chatbotv1/query');
    const reply = async (ctx, getResponse) => {
        const res = await getResponse();
        if (res.data && res.data.length > 0) {
            if (res.data[0].type === 'quit-app') return ctx.reply(res.reply).closeSession();
            if (res.data[0].type === 'start-record') {
                if (res.data[0]['audio-url']) {
                    return ctx.directiveTts(res.endReply).directiveAudio(res.data[0]['audio-url']).record();
                }
                return ctx.query(res.reply).record();
            }
            if (res.data[0].type === 'play-record') {
                const fileId = res.data[0]['file-id'];
                const content = res.data[0].content;
                const audio = res.data[0]['audio-url'];
                const needRecord = ((res.data.length > 1) && (res.data[1].type === 'start-record'));

                if (res.reply) {
                    ctx.directiveTts(res.reply);
                }
                if (fileId && fileId !== '') {
                    ctx.directiveRecord(fileId)
                } else if (content && content != '') {
                    ctx.directiveTts(content)
                }
                if (res.endReply) {
                    ctx.directiveTts(res.endReply)
                }
                if (audio) {
                    ctx.directiveAudio(audio)
                }
                if (needRecord) {
                    ctx.response.record()
                } else {
                    ctx.response.wait()
                }
            }
        }
        let ret = ctx.query(res.reply);
        console.log(`the reply is ${JSON.stringify(ret)}`);
        return ret;
    };
    ctx.replyToText = async () => {
        await reply(ctx, async () => {return await chatbot.replyToText(ctx.request.user, ctx.request.query)});
    };
    ctx.replyToEvent = async (eventName) => {
        await reply(ctx, async () => {return await chatbot.replyToEvent(ctx.request.user, eventName)});
    };
    ctx.replyToRecord = async () => {
        let asr = ctx.request.eventProperty.asr_text;
        let fileId = ctx.request.eventProperty.msg_file_id;
        await reply(ctx, async () => {return await chatbot.replyToRecord(ctx.request.user, asr, fileId)});
    };
    await next();
});

aixbot.onEvent('noResponse', async (ctx) =>{
    await ctx.replyToEvent('no-response');
});

aixbot.onEvent('enterSkill', async (ctx) => {
    await ctx.replyToEvent('open-app');
});

aixbot.onEvent('quitSkill', async (ctx) => {
    await ctx.replyToEvent('close-app');
});

// define error handler
aixbot.onError((err, ctx) => {
    logger.error(`error occurred: ${err}`);
    ctx.reply('内部错误，稍后再试').closeSession();
});

logger.info("start run on 8090")
aixbot.run(8090);