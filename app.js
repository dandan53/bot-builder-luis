var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

var luisHelper =  require("./src/luisHelper.js");

bot.dialog('/', [
    function (session) {
       // session.send("You're in a large clearing. There's a path to the north.");
       // builder.Prompts.choice(session, "command?", ["north", "look"]);
        builder.Prompts.text(session, 'Hi! What would you like to do?');

    },
    function (session, results) {

        // call LUIS
        if (results.response)
        {
            var text = results.response.toLowerCase();
            luisHelper.callLuis(text, 0.1)
                .then(function (result) {
                    console.log("luisHelper result: " + result);
                    result = JSON.parse(result);
                    session.dialogData.openTrade = {};
                    // parse the response
                    if (result && result.topScoringIntent){
                        var intent = result.topScoringIntent.intent;
                        if (intent == "OpenPosition")
                        {
                            if (result.entities && result.entities.length > 0){
                                var BuyOrSell = getEntityByType("BuyOrSell", result.entities);
                                if (BuyOrSell){
                                    console.log("BuyOrSell: " + JSON.stringify(BuyOrSell));
                                    session.dialogData.openTrade.BuyOrSell = BuyOrSell.entity;
                                    console.log("session.dialogData.openTrade.BuyOrSell: " + session.dialogData.openTrade.BuyOrSell);
                                }
                                var Instrument = getEntityByType("Instrument", result.entities);
                                if (Instrument){
                                    console.log("Instrument: " + JSON.stringify(Instrument));
                                    session.dialogData.openTrade.Instrument = Instrument.entity;
                                    console.log("session.dialogData.openTrade.Instrument: " + session.dialogData.openTrade.Instrument);

                                }
                                var Price = getEntityByType("Price", result.entities);
                                if (Price){
                                    console.log("Price: " + JSON.stringify(Price));
                                    session.dialogData.openTrade.Price = Price.entity;
                                    console.log("session.dialogData.openTrade.Price: " + session.dialogData.openTrade.Price);

                                }
                            }

                            console.log("session.dialogData.openTrade: " + JSON.stringify(session.dialogData.openTrade));

                            // if entity doesn't exist try to find the word
                            if (!session.dialogData.openTrade.BuyOrSell ||
                                (session.dialogData.openTrade.BuyOrSell != 'sell' &&
                                session.dialogData.openTrade.BuyOrSell != 'buy')
                                )
                            {
                                var isSell = text.includes("sell");
                                if (isSell)
                                {
                                    session.dialogData.openTrade.BuyOrSell = 'sell';
                                }
                                else {
                                    var isBuy = text.includes("buy");
                                    if (isSell) {
                                        session.dialogData.openTrade.BuyOrSell = 'buy';
                                    }
                                }
                            }
                        }
                        else
                        {
                            //session.beginDialog('/openTrade', session.userData.openTrade);
                        }
                    }
                }, function (err) {
                    throw error;
                });
        }

        session.replaceDialog("/room1");
        /*
        switch (results.repsonse.entity) {
            case "north":
                session.replaceDialog("/room1");
                break;
            default:
                session.replaceDialog("/");
                break;
        }*/
    }
]);
bot.dialog('/room1', [
    function (session) {
        session.send("room1");

        builder.Prompts.choice(session, "command?", ["open gate", "south", "west", "look"]);
    },
    function (session, results) {
        switch (results.repsonse.entity) {
            case "open gate":
                session.replaceDialog("/room2");
                break;
            case "south":
                session.replaceDialog("/");
                break;
            case "west":
                session.replaceDialog("/room3");
                break;
            default:
                session.replaceDialog("/room1");
                break;
        }
    }
]);

bot.dialog('/room2', [
    function (session) {
        session.send("room2");

        builder.Prompts.choice(session, "command?", ["open gate", "south", "west", "look"]);
    },
    function (session, results) {
        switch (results.repsonse.entity) {
            case "open gate":
                session.replaceDialog("/room2");
                break;
            case "south":
                session.replaceDialog("/");
                break;
            case "west":
                session.replaceDialog("/room3");
                break;
            default:
                session.replaceDialog("/room1");
                break;
        }
    }
]);

var getEntityByType = function (type, entities) {
    var retVal = null;
    if (entities && entities.length > 0) {
        var obj = entities.filter(function (obj) {
            return obj.type === type;
        });
        if (obj && obj.length > 0) {
            retVal = obj[0];
        }
    }
    return retVal;
};
