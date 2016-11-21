var request = require('request-promise');
var Promise = require('bluebird');

var url = "https://api.projectoxford.ai/luis/v2.0/apps/9d89f089-82ec-41a7-9587-e60db39b9ef5?subscription-key=e0ceba08eaa449c7af57369a47062469&q=";

exports.callLuis = function (text, threashold) {
    if (threashold === void 0) { threashold = 0; }
    return new Promise(function (resolve, reject) {
        return request(url + encodeURIComponent(text))
            .then(function (result) {
                var json = JSON.parse(result);
                console.log("json: " + json);
                console.log("result: " +result);

                if (!json || !json.topScoringIntent){
                    return resolve();
                }

                if (json.topScoringIntent.score < threashold){
                    return resolve();
                }

                return resolve(result);
            })
            .catch(reject);
    });
};


/*
exports.callLuis1 = function(text) {

    var uri = "https://api.projectoxford.ai/luis/v2.0/apps/9d89f089-82ec-41a7-9587-e60db39b9ef5?subscription-key=e0ceba08eaa449c7af57369a47062469&q=";

    uri += encodeURIComponent(text);

    request(uri,
        function(error, response, body) {
            console.log(JSON.stringify(body));
            return body;
        })
};
*/


