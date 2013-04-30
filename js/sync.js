Backbone.sync = function(method, model, options) {
    if (model instanceof Page) {
        switch (method) {
        case 'read':
            Backend.page.get(model.id, function(error, page){
                if (error) {
                    if (error === Backend.NOT_FOUND) {
                        options.error(Wiki.NO_PAGE);
                    } else {
                        console.log('error', error);
                    }
                } else {
                    model.set(page);
                    options.success();
                }
            });
            break;
        case 'create':
            Backend.page.create(model.id, model.attributes, function(error){
                if (error) {
                    if (error === Backend.EXISTS) {
                        options.error(Wiki.EXISTS);
                    } else {
                        console.log('error', error);
                    }
                } else {
                    options.success();
                }
            });
            break;
        case 'update':
            Backend.page.put(model.id, model.attributes, function(error){
                if (error) {
                    console.log('error', error);
                } else {
                    options.success();
                }
            });
            break;
        case 'delete':
            Backend.page.remove(model.id, function(error){
                if (error) {
                    console.log('error', error);
                } else {
                    options.success();
                }
            });
            break;
        default:
            console.log('sync', method);
        }
    } else {
        console.log('sync model', model);
    }
};
