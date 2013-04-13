var Router = Backbone.Router.extend({
    initialize: function(options) {
        var self = this;

        this.pages = options.pages;
        this.view = options.view;

        // Роуты будут применяться в обратном порядке

        this.route(/.*/, this.error_400);

        this.route(/^([a-z0-9_]+(?:\/[a-z0-9_]+)*)$/, this.page);
        this.route(/^([a-z0-9_]+(?:\/[a-z0-9_]+)*)\/add$/, this.page_add);
        this.route(/^([a-z0-9_]+(?:\/[a-z0-9_]+)*)\/edit$/, this.page_edit);
        this.route(/^([a-z0-9_]+(?:\/[a-z0-9_]+)*)\/delete$/, this.page_delete);

        this.route(/^$/, function(){ self.navigate('main_page', {trigger: true}); });
    },

    page: function(id, options) {
        var self = this;
        options = options ? options : {};
        var showDelete = options.showDelete;

        this.pages.retrive(id, {
            success: function(page) {
                var pageView = self.view.toggle(PageView, page);
                page.listenTo(pageView, 'edit', function(){
                    Wiki.router.navigate(id + '/edit', {trigger: true});
                }).listenTo(pageView, 'delete_confirm', function(){
                    page.destroy({
                        success: onPageDeleted
                    });
                }).listenTo(pageView, 'wiki_links', function(links){
                    Backend.pages.isExists(links, function(error, links){
                        pageView.wikiLinks(links);
                    });
                });

                pageView.render();

                if (showDelete) {
                    pageView.showDelete();
                }

                function onPageDeleted() {
                    self.view.toggle(Error404View, id);
                }
            },
            error: function(model, response) {
                if (response === Wiki.NO_PAGE) {
                    self.view.toggle(Error404View, id);
                } else {
                    console.log('error', response);
                }
            }
        });
    },
    page_add: function(id) {
        this.page_edit(id);
    },
    page_edit: function(id) {
        var self = this;

        this.pages.retrive(id, {
            success: edit,
            error: function(model, response) {
                if (response === Wiki.NO_PAGE) {
                    edit(new Page({
                        id: id,
                        title: id,
                        content: ''
                    }));
                } else {
                    console.log('error', response);
                }
            }
        });

        function edit(page) {
            var editView = self.view.toggle(PageEditView, page);
            page.listenTo(editView, 'cancel', function(){
                Wiki.router.navigate(id, {trigger: true});
            }).listenTo(editView, 'save', function(data){
                page.save(data, {
                    success: function(){
                        self.navigate(id, {trigger: true});
                    }
                });
            });

            editView.render();
        }
    },
    page_delete: function(id) {
        if (id !== 'main_page') {
            this.navigate(id, {trigger: false});
            this.page(id, {
                showDelete: true
            });
        } else {
            this.navigate('main_page', {trigger: true});
        }
    },

    error_400: function() {
        this.view.toggle(Error400View);
    }
});

$(function(){
    // Этот метод создаст вики, если она пуста
    Backend._init(start);

    function start() {
        // Вся работа начинается отсюда
        var pages = new Pages();
        var view = new View();

        Wiki.router = new Router({
            pages: pages,
            view: view
        });
        Backbone.history.start({pushState: false});
    }
});
