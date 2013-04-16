// Главный вью, отвечающий за переключение экранов
var View = Backbone.View.extend({
    initialize: function() {
        this.currentLayout = 'page';
        this.currentView = null;

        // Модальные диалоги у нас что-то около синглтонов
        this.pageDeleteModal = new PageDeleteModal({
            el: $('#page_delete_modal')
        });
        this.pageAddModal = new PageAddModal({
            el: $('#page_add_modal')
        });

        // Объект для кеширования наших вью
        this.views = {};
    },

    toggle: function(_View) {
        var newView = this.views[_View.LAYOUT_ID];

        if (!newView) {
            newView = new _View({
                el: $('#' + _View.LAYOUT_ID)
            });
            this.views[_View.LAYOUT_ID] = newView;
        }

        if (this.currentView) {
            this.currentView.hide();
        }

        newView.show();
        this.currentView = newView;

        return newView;
    }
});

// Т.к. у нас все "вью" синглтоны, этот класс
// будет определять некоторые методы им присущие
var SingleView = Backbone.View.extend({
    show: function() {
        this.$el.show();
        this.delegateEvents();
    },
    hide: function() {
        this.$el.hide();
        this.undelegateEvents();
    }
});

// Страница
var PageView = SingleView.extend({
    hide: function() {
        SingleView.prototype.hide.call(this);
        $('#page_delete_modal').modal('hide');
    },

    events: {
        'click #page_add_button': 'add',
        'click #page_edit_button': 'edit',
        'click #page_delete_button': 'del'
    },

    add: function() {
        this.trigger('add');
    },
    edit: function() {
        this.trigger('edit');
    },
    del: function() {
        this.trigger('delete');
    },

    render: function(options) {
        if (options.model.isMainPage()) {
            $('#page_delete_button').hide();
        } else {
            $('#page_delete_button').show();
        }

        var title = options.model.get('title');
        var content = options.model.get('content');
        var rendered = $(Wiki.parser.parse(content));

        // Выбираем вики-линки из отрендереного текста
        var wikiLinks = {};
        $('.--parser-wiki-link', rendered).each(function(){
            var a = $(this);
            var id = a.attr('href').substring(1).replace(PageView.ACTION_REGEXP, '');
            wikiLinks[id] = true;
        });
        // Говорим, что мы их получили. Будет вызван метод `wikiLinks` с этим же объектом,
        // но с информацией, есть ли такая страница или нет.
        this.trigger('wiki_links', wikiLinks);

        // Заполняет breadcrumb
        function createPart(part) {
            // Создаёт li для breadcrumb'а (пути с родительскими страницами)
            var a = $('<a>').attr('href', '#' + part.id).text(part.title);

            if (!part.exists) {
                a.attr('href', a.attr('href') + '/add').addClass('text-error');
            }

            return $('<li>').append(
                a
            ).append(' '
            ).append(
                $('<span>').addClass('divider').text('/'));
        }
        $('#page_path > :not(.buttons)').remove();
        options.model.get('parents').map(function(part){
            $('#page_path').append(createPart(part));
        });
        $('#page_path').append(
            $('<li>').addClass('active').text(title)
        );

        function createUl(tree, prev) {
            // Создаёт ul дерева дочерних элементов
            var ul = $('<ul>');
            for (var name in tree) if (tree.hasOwnProperty(name) && name !== '$exists' && name !== '$title') {
                var id = prev + '/' + name;
                var c = createUl(tree[name], id);
                var a = $('<a>').attr('href', '#' + id).text(tree[name].$title);
                if (!tree[name].$exists) {
                    a.addClass('text-error');
                    a.attr('href', a.attr('href') + '/edit');
                }
                var li = $('<li>').append(a);
                if (c) {
                    li.append(c);
                }
                ul.append(li);
            }
            if (ul.children().length === 0) {
                return null;
            } else {
                return ul;
            }
        }
        var ul = createUl(options.model.get('childs'), options.model.id);
        if (ul) {
            $('#page_childs_block').show();
            $('#page_childs').replaceWith(ul);
            ul.attr('id', 'page_childs');
        } else {
            // Если нет дочерних, скрываем этот блок
            $('#page_childs_block').hide();
        }

        $('#page_content').html(rendered);
        $('#page_delete_modal_page_title').text(title);
    },
    wikiLinks: function(links) {
        for (var id in links) if (links.hasOwnProperty(id)) {
            if (!links[id]) {
                var a = $('a[href=\'#' + id + '\']', this.content);
                a.addClass('text-error');
                if (!PageView.ACTION_REGEXP.test(a.attr('href'))) {
                    // Если ссылка не является действием,
                    // делаем её действием редактирования страницы (несуществующей)
                    a.attr('href', a.attr('href') + '/edit');
                }
            }
        }
    }
}, {
    LAYOUT_ID: 'page',
    ACTION_REGEXP: /(?:\/edit)|(?:\/add)|(?:\/delete)$/
});

// Редактирование страницы
var PageEditView = SingleView.extend({
    initialize: function() {
        this.title = $('#edit_title');
        this.content = $('#edit_content');
    },

    events: {
        'click #edit_cancel_button': 'cancel',
        'click #edit_save_button': 'save'
    },

    cancel: function() {
        this.trigger('cancel');
    },
    save: function() {
        this.trigger('save', {
            title: this.title.val(),
            content: this.content.val()
        });
    },

    render: function(options) {
        this.title.val(options.model.get('title'));
        var content = options.model.get('content');
        content = content ? content : '';
        this.content.val(content);
    }
}, {LAYOUT_ID: 'edit'});

// Несуществующая страница
var Error404View = SingleView.extend({
    render: function(options) {
        $('#404_create_button').attr('href', '#' + options.pageId + '/edit');
    }
}, {LAYOUT_ID: '404'});

// Ошибка в адресе
var Error400View = SingleView.extend({}, {LAYOUT_ID: '400'});

var ModalView = Backbone.View.extend({
    show: function() {
        this.$el.modal();
    },
    hide: function() {
        this.$el.modal('hide');
    }
});

var PageDeleteModal = ModalView.extend({
    events: {
        'click #page_delete_confirm_button': function() {
            this.trigger('delete_confirm');
        }
    }
});

var PageAddModal = ModalView.extend({
    events: {
        'click #page_add_confirm_button': function() {
            var isValid = $('#page_add_id').get(0).checkValidity() &&
                    $('#page_add_title').get(0).checkValidity();

            if (isValid) {
                var id = $('#page_add_id').val();
                var title = $('#page_add_title').val();
                this.trigger('create', id, title);
            }
        }
    },

    error: function(options) {
        if (options.exists) {
            $('#page_add_error_exists').show();
        }
    },

    render: function(options) {
        $('#page_add_error_exists').hide();
        $('#page_add_parent').text(options.parent + '/');
        $('#page_add_id').val('');
        $('#page_add_title').val('Новая страница');
    }
});
