var Page = Backbone.Model.extend({
    isMainPage: function() {
        return this.id === 'main_page';
    }
});

// Эта коллекция используется лишь как апи-объект для страниц,
// на самом деле она ничего не хранит.
// Возможно она могла бы хранить какой-то кеш объектов и запрашивать
// у сервера лишь изменилась ли запрашиваемая страница с прошлого получения или нет.
// Но при текущей реализации бэкэнда это не имеет смысла.
var Pages = Backbone.Collection.extend({
    model: Page,

    // Функция для получения страницы от бэкэнда
    retrive: function(id, options) {
        var self = this;

        page = new Page({
            id: id
        });

        page.fetch(options);
    }
});
