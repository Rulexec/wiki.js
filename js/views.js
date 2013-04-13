// Главный вью, отвечающий за переключение экранов
var View = Backbone.View.extend({
    initialize: function() {
        this.currentLayout = 'page';
        this.currentView = null;

        // Модальные диалоги у нас что-то около синглтонов
        // FIXME Остальные вью, на самом деле тоже могут не создаваться по сто раз.
        this.pageDeleteModal = new PageDeleteModal({
            el: $('#page_delete_modal')
        });
        this.pageAddModal = new PageAddModal({
            el: $('#page_add_modal')
        });
    },

    toggle: function(_View, options) {
        $('#' + this.currentLayout).hide();
        $('#' + _View.LAYOUT_ID).show();
        this.currentLayout = _View.LAYOUT_ID;

        if (this.currentView) {
            this.currentView.stopListening();
            if (this.currentView.model instanceof Backbone.Model) {
                this.currentView.model.stopListening(this.currentView);
            }
            this.currentView.trigger('destroy');
        }

        options.el = $('#' + _View.LAYOUT_ID);
        this.currentView = new _View(options);
        return this.currentView;
    }
});

// Страница
var PageView = Backbone.View.extend({
    initialize: function() {
        if (this.model.isMainPage()) {
            $('#page_delete_button').hide();
        } else {
            $('#page_delete_button').show();
        }

        this.once('destroy', function(){
            $('#page_delete_modal').modal('hide');
        });
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

    render: function() {
        var self = this;

        var title = this.model.get('title');
        var content = this.model.get('content');
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
        this.model.get('parents').map(function(part){
            $('#page_path').append(createPart(part));
        });
        $('#page_path').append(
            $('<li>').addClass('active').text(title)
        );

        function createUl(tree, prev) {
            // Создаёт ul дерева дочерних элементов
            var ul = $('<ul>');
            for (var name in tree) if (tree.hasOwnProperty(name) && name !== 'exists' && name !== '$title') {
                var id = prev + '/' + name;
                var c = createUl(tree[name], id);
                var a = $('<a>').attr('href', '#' + id).text(tree[name].$title);
                if (!tree[name].exists) {
                    a.addClass('text-error');
                    a.attr('href', a.attr('href') + '/add');
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
        var ul = createUl(this.model.get('childs'), self.model.id);
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
var PageEditView = Backbone.View.extend({
    initialize: function() {
        this.title = $('#edit_title');
        this.content = $('#edit_content');

        this.render();
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

    render: function() {
        this.title.val(this.model.get('title'));
        var content = this.model.get('content');
        content = content ? content : '';
        this.content.val(content);
    }
}, {LAYOUT_ID: 'edit'});

// Несуществующая страница
var Error404View = Backbone.View.extend({
    initialize: function(options) {
        this.pageId = options.pageId;
        this.render();
    },

    render: function() {
        $('#404_create_button').attr('href', '#' + this.pageId + '/edit');
    }
}, {LAYOUT_ID: '404'});

// Ошибка в адресе
var Error400View = Backbone.View.extend({}, {LAYOUT_ID: '400'});

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

    render: function(options) {
        $('#page_add_parent').text(options.parent + '/');
        $('#page_add_id').val('');
        $('#page_add_title').val('Новая страница');
    }
});
