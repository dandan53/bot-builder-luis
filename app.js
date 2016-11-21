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
                    session.userData.openTrade = {};
                    // parse the response
                    if (result && result.topScoringIntent){
                        var intent = result.topScoringIntent.intent;
                        if (intent == "OpenPosition")
                        {
                            if (result.entities && result.entities.length > 0){
                                var BuyOrSell = getEntityByType("BuyOrSell", result.entities);
                                if (BuyOrSell){
                                    console.log("BuyOrSell: " + JSON.stringify(BuyOrSell));
                                    session.userData.openTrade.BuyOrSell = BuyOrSell.entity;
                                    console.log("session.userData.openTrade.BuyOrSell: " + session.userData.openTrade.BuyOrSell);
                                }
                                var Instrument = getEntityByType("Instrument", result.entities);
                                if (Instrument){
                                    console.log("Instrument: " + JSON.stringify(Instrument));
                                    session.userData.openTrade.Instrument = Instrument.entity;
                                    console.log("session.userData.openTrade.Instrument: " + session.userData.openTrade.Instrument);

                                }
                                var Price = getEntityByType("Price", result.entities);
                                if (Price){
                                    console.log("Price: " + JSON.stringify(Price));
                                    session.userData.openTrade.Price = Price.entity;
                                    console.log("session.userData.openTrade.Price: " + session.userData.openTrade.Price);

                                }
                            }

                            console.log("session.userData.openTrade: " + JSON.stringify(session.userData.openTrade));

                            // if entity doesn't exist try to find the word
                            if (!session.userData.openTrade.BuyOrSell ||
                                (session.userData.openTrade.BuyOrSell != 'sell' &&
                                session.userData.openTrade.BuyOrSell != 'buy')
                                )
                            {
                                session.userData.openTrade.BuyOrSell = null;

                                var isSell = text.includes("sell");
                                if (isSell)
                                {
                                    session.userData.openTrade.BuyOrSell = 'sell';
                                }
                                else {
                                    var isBuy = text.includes("buy");
                                    if (isSell) {
                                        session.userData.openTrade.BuyOrSell = 'buy';
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
                session.userData.openTrade.BuyOrSell = "buy";
                break;
            case "Sell":
                session.userData.openTrade.BuyOrSell = "sell";
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
        session.userData.openTrade.Instrument = results.response;
        dialogRouter(session);
    }
]);

bot.dialog('/openTradeNoPrice', [
    function (session) {
        builder.Prompts.number(session, 'What is the amount you would like to invest?');
    },
    function (session, results) {
        session.userData.openTrade.Price = results.response;
        dialogRouter(session);
    }
]);

bot.dialog('/openTradeFull', [
    function (session)
    {
         if (session.userData.openTrade &&
            session.userData.openTrade.BuyOrSell &&
            session.userData.openTrade.Instrument &&
            session.userData.openTrade.Price)
            {
                var buyOrSell = session.userData.openTrade.BuyOrSell;
                var instrument = session.userData.openTrade.Instrument;
                var price = session.userData.openTrade.Price;
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

    if (!session.userData.openTrade || (
        !session.userData.openTrade.BuyOrSell &&
        !session.userData.openTrade.Instrument &&
        !session.userData.openTrade.Price))
    {
        session.replaceDialog('/openTradeEmpty');
    }
    else if (session.userData.openTrade &&
        !session.userData.openTrade.BuyOrSell)
    {
        session.replaceDialog('/openTradeNoBuyOrSell');
    }
    else if (session.userData.openTrade &&
        !session.userData.openTrade.Instrument)
    {
        session.replaceDialog('/openTradeNoInstrument');
    }
    else if (session.userData.openTrade &&
        !session.userData.openTrade.Price)
    {
        session.replaceDialog('/openTradeNoPrice');
    }
    else if (session.userData.openTrade &&
        session.userData.openTrade.BuyOrSell &&
        session.userData.openTrade.Instrument &&
        session.userData.openTrade.Price)
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
