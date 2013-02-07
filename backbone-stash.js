// Provides a `Backbone.sync` or `Model.sync` method for the server-side
// context. Uses `stash` for model persistence. Models are expected to
// have a URL prefixed by their respective collection (e.g. `/{class}/{id}`)
// and Collections retrieve their respective models based on this convention.
var _ = require('underscore'),
    jQuery = require('jquery');



module.exports = function(filepath) {
    var stash = require('stash')(filepath);

    // Helper function to get a URL from a Model or Collection as a property
    // or as a function.
    var getUrl = function(object) {
        if (object.url instanceof Function) {
            return object.url();
        } else if (typeof object.url === 'string') {
            return object.url;
        }
    };

    // Sync implementation for `stash`.
    var sync = function(method, model, options) {
        var options = options || {};

        var defer = jQuery.Deferred();
        defer.done(options.success).fail(options.error);

        var success = defer.resolve,
            error = defer.reject;

        // what a miserable way to do this.
        (function(){
            switch (method) {
            case 'read':
                var data,
                    base = stash.key(getUrl(model));
                if (model.id) {
                    data = stash.get(base);
                    return data ? success(model, data, options) : error('Model not found.');
                } else {
                    data = [];
                    _.each(stash.list(), function(val, key) {
                        val && key.indexOf(base) === 0 && data.push(val);
                    });
                    return success(model, data, options);
                }
                break;
            case 'create':
            case 'update':
                if (_.isEqual(stash.get(getUrl(model)), model.toJSON())) {
                    return success(model, {}, options);
                }
                stash.set(
                    getUrl(model),
                    model.toJSON(),
                    function(err) {
                        return err ? error(model, err, options) : success(model, {}, options);
                    }
                );
                break;
            case 'delete':
                if (typeof stash.get(getUrl(model)) === 'undefined') {
                    return success(model, {}, options);
                }
                stash.rm(
                    getUrl(model),
                    function(err) {
                        return err ? error(model, err, options) : success(model, {}, options);
                    }
                );
                break;
            }
        })();

        return defer.promise();
    };

    return { stash: stash, sync: sync };
};

