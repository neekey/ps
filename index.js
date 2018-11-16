var ps = module.exports = require('./lib');

var lookupPromise = module.exports.lookupPromise = function(query){
    return new Promise(function(resolve, reject){
        ps.lookup(query, function(err, psList){
            if(err){
                reject(err);
            }

            resolve(psList);
        });
    });
}

var exists = module.exports.exists = function(query){
    return lookupPromise(query)
        .then(_=>_ && _.length > 0)
        .catch(_=>_);
}
