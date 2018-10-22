const postJson = require('./postjson');
const logger = require('./logger').logger('chatbot');

class Chatbot {
    constructor(agent, uri) {
        this.agent = agent;
        this.uri = uri;
    }
    
    async replyToText(user, text) {
        let data = { query   : { query : text, confidence : 1.0 }, 
                     session : user.user_id, 
                     agent   : this.agent, 
                     userContext : { access_token : user.access_token } };
        logger.info("send to url", this.uri, "body", JSON.stringify(data))
        let response = await postJson(this.uri, data);
        logger.info('response', response)
        return this.formatResponse(response);
    }

    async replyToRecord(user, asr, fileId) {
        let data = { query   : { query : asr, confidence : 1.0 }, 
                     session : user.user_id, 
                     agent   : this.agent, 
                     userContext : { access_token : user.access_token, file_id : fileId } };

        let response = await postJson(this.uri, data);
        return this.formatResponse(response);        
    }
    
    async replyToEvent(user, eventType, params) {
        let data = { event   : { name : eventType, content : params },
                     session : user.user_id, 
                     agent   : this.agent, 
                     userContext : { access_token : user.access_token } };
        logger.info("send to url", this.uri, "body", JSON.stringify(data))
        let response = await postJson(this.uri, data);
        return this.formatResponse(response);
    }

    formatResponse(response) {
        logger.debug(`chatbot reply ${JSON.stringify(response)}`);
        if (response.reply) {
            let ret = this.concatReplies(response.reply);
            response.reply = ret.reply
            response.endReply = ret.endReply
        }
        return response;
    }

    concatReplies(replies) {
        let ret = {}
        ret.reply = ''
        ret.endReply = ''
        let hasRecord = false
        for(let i = 0; i < replies.length; i++) {
            if(replies[i] == 'play-record')
            {
                hasRecord = true
                continue
            }
            if(hasRecord){
               ret.endReply += replies[i]
            }
            else{
               ret.reply += replies[i];    
            }
        }       
        return ret;
    }
}

module.exports = Chatbot;
