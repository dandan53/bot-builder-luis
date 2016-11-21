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
                    session.openTrade = {};
                    // parse the response
                    if (result && result.topScoringIntent){
                        var intent = result.topScoringIntent.intent;
                        if (intent == "OpenPosition")
                        {
                            if (result.entities && result.entities.length > 0){
                                var BuyOrSell = getEntityByType("BuyOrSell", result.entities);
                                if (BuyOrSell){
                                    console.log("BuyOrSell: " + JSON.stringify(BuyOrSell));
                                    session.openTrade.BuyOrSell = BuyOrSell.entity;
                                    console.log("session.openTrade.BuyOrSell: " + session.openTrade.BuyOrSell);
                                }
                                var Instrument = getEntityByType("Instrument", result.entities);
                                if (Instrument){
                                    console.log("Instrument: " + JSON.stringify(Instrument));
                                    session.openTrade.Instrument = Instrument.entity;
                                    console.log("session.openTrade.Instrument: " + session.openTrade.Instrument);

                                }
                                var Price = getEntityByType("Price", result.entities);
                                if (Price){
                                    console.log("Price: " + JSON.stringify(Price));
                                    session.openTrade.Price = Price.entity;
                                    console.log("session.openTrade.Price: " + session.openTrade.Price);

                                }
                            }

                            console.log("session.openTrade: " + JSON.stringify(session.openTrade));

                            // if entity doesn't exist try to find the word
                            if (!session.openTrade.BuyOrSell ||
                                (session.openTrade.BuyOrSell != 'sell' &&
                                session.openTrade.BuyOrSell != 'buy')
                                )
                            {
                                var isSell = text.includes("sell");
                                if (isSell)
                                {
                                    session.openTrade.BuyOrSell = 'sell';
                                }
                                else {
                                    var isBuy = text.includes("buy");
                                    if (isSell) {
                                        session.openTrade.BuyOrSell = 'buy';
                                    }
                                }
                            }

                            session.replaceDialog("/openTradeFull");
                        }
                        else
                        {
                            session.replaceDialog("/openTradeEmpty");
                        }
                    }
                }, function (err) {
                    throw error;
                });
        }
        else
        {
            session.replaceDialog("/openTradeEmpty");
        }

        session.replaceDialog("/openTradeEmpty");

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

bot.dialog('/openTradeEmpty', [
    function (session) {
        session.send('All details are missing. Please write again');
        session.replaceDialog("/");
    }
]);

bot.dialog('/openTradeFull', [
    function (session)
    {
         if (session.openTrade &&
            session.openTrade.BuyOrSell &&
            session.openTrade.Instrument &&
            session.openTrade.Price)
            {
                var buyOrSell = session.openTrade.BuyOrSell;
                var instrument = session.openTrade.Instrument;
                var price = session.openTrade.Price;
                var message = buyOrSell + " position of " + instrument + " was opened in " + price +"$";
                session.send(message);
            }
            else
             {
                 session.send("missing some info");
             }
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
