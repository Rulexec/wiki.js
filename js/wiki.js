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
                if (!page.isNew()) {
                    var pageView = self.view.toggle(PageView, page);
                    page.listenTo(pageView, 'edit', function(){
                        Wiki.router.navigate(id + '/edit', {trigger: true});
                    }).listenTo(pageView, 'delete_confirm', function(){
                        page.destroy({
                            success: onPageDeleted
                        });
                    });

                    if (showDelete) {
                        pageView.showDelete();
                    }

                    function onPageDeleted() {
                        self.view.toggle(Error404View, id);
                    }
                } else {
                    self.view.toggle(Error404View, id);
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
            success: function(page) {
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
            }
        });
    },
    page_delete: function(id) {
        if (id === 'main_page') {
            this.navigate('main_page', {trigger: true});
            return;
        }

        this.navigate(id, {trigger: false});
        this.page(id, {
            showDelete: true
        });
        /*var self = this;

        this.pages.retrive(id, {
            success: function(page) {
                if (!page.isNew()) {
                    var pageView = self.view.toggle(PageView, page);
                    page.listenTo(pageView, 'delete_cancel', function(){
                        console.log('cancel');
                    }).listenTo(pageView, 'delete_confirm', function(){
                        console.log('confirm');
                    });
                    pageView.showDelete();
                } else {
                    self.view.toggle(Error404View, id);
                }
            }
        });*/
    },

    error_400: function() {
        this.view.toggle(Error400View);
    }
});

$(function(){
    var pages = new Pages();
    /*pages.retrive('main_page', {
        success: onMainGet
    });
    
    function onMainGet(mainPage){
        if (mainPage.isNew()) {
            var mainPageTitle = 'Главная страница';
            var mainPageDefaultContent = 'Пустая главная страница. Вы можете её [[main_page/edit отредактировать]].';

            mainPage.save({
                title: mainPageTitle,
                content: mainPageDefaultContent
            }, {
                success: start
            });
        } else {
            start();
        }
    }*/

    Wiki.createIfFirstTime();

    start();

    function start() {
        var view = new View();

        Wiki.router = new Router({
            pages: pages,
            view: view
        });
        Backbone.history.start({pushState: false});
    }
});
