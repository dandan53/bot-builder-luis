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
                                session.openTrade.BuyOrSell = null;

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
                            ////// router ///////
                            dialogRouter(session);
                        }
                        else
                        {
                            session.replaceDialog('/openTradeNoBuyOrSell');
                        }
                    }
                }, function (err) {
                    throw error;
                });
        }
        else
        {
            session.replaceDialog('/openTradeEmpty');
        }

       // session.replaceDialog('/openTradeEmpty');
    }
]);

bot.dialog('/openTradeEmpty', [
    function (session) {
        session.send('All details are missing. Please write again');
        session.replaceDialog("/");
    }
]);

bot.dialog('/openTradeNoBuyOrSell', [
    function (session) {
        builder.Prompts.choice(session, "Would you like to buy or sell?", ["Buy", "Sell"]);
    },
    function (session, results) {
        switch (results.repsonse.entity) {
            case "Buy":
                session.openTrade.BuyOrSell = "buy";
                break;
            case "Sell":
                session.openTrade.BuyOrSell = "sell";
                break;
            default:
                session.replaceDialog("/openTradeNoBuyOrSell");
                break;
        }

        dialogRouter(session);
    }
]);

bot.dialog('/openTradeNoInstrument', [
    function (session) {
        builder.Prompts.text(session, 'Which instrument would you like to invest?');
    },
    function (session, results) {
        session.openTrade.Instrument = results.response;
        dialogRouter(session);
    }
]);

bot.dialog('/openTradeNoPrice', [
    function (session) {
        builder.Prompts.number(session, 'What is the amount you would like to invest?');
    },
    function (session, results) {
        session.openTrade.Price = results.response;
        dialogRouter(session);
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

var dialogRouter = function (session) {

    if (!session.openTrade || (
        !session.openTrade.BuyOrSell &&
        !session.openTrade.Instrument &&
        !session.openTrade.Price))
    {
        session.replaceDialog('/openTradeEmpty');
    }
    else if (session.openTrade &&
        !session.openTrade.BuyOrSell)
    {
        session.replaceDialog('/openTradeNoBuyOrSell');
    }
    else if (session.openTrade &&
        !session.openTrade.Instrument)
    {
        session.replaceDialog('/openTradeNoInstrument');
    }
    else if (session.openTrade &&
        !session.openTrade.Price)
    {
        session.replaceDialog('/openTradeNoPrice');
    }
    else if (session.openTrade &&
        session.openTrade.BuyOrSell &&
        session.openTrade.Instrument &&
        session.openTrade.Price)
    {
        session.replaceDialog('/openTradeFull');
    }
};


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
