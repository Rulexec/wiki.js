var Page = Backbone.Model.extend({
    isNew: function() {
        return this.get('content') === null;
    },
    isMainPage: function() {
        return this.id === 'main_page';
    },
    parentPages: function(options) {
        var count = 0;
        var parts = '';
        var result = this.id.split('/');
        result = result.slice(0, result.length - 1).map(function(part){
            parts += (count !== 0 ? '/' : '') + part;
            count++;

            var o = {
                id: parts,
                title: null
            };

            // Опасный манёвр, обязательно нужно, чтобы getPageTitle была асинхронной
            // и выполнилась после того, как мы закончим map
            Wiki.getPageTitle(parts, {
                success: function(title) {
                    o.isExists = Boolean(title);
                    o.title = o.isExists ? title : o.id;

                    count--;
                    if (count === 0) {
                        options.success(result);
                    }
                }
            });

            return o;
        });

        if (result.length === 0) {
            options.success([]);
        }
    },
    childs: function(options) {
        Wiki.getPageChilds(this.id, options);
    }
});

var Pages = Backbone.Collection.extend({
    model: Page,

    retrive: function(id, options) {
        var self = this;

        var page = this.get(id);
        var add = false;

        if (page === undefined) {
            add = true;
            page = new Page({
                id: id
            });
        }

        page.fetch({
            success: onFetched,
            error: options.error
        });

        function onFetched() {
            if (add) {
                self.add(page);
            }
            options.success.apply(null, arguments);
        }
    }
});
