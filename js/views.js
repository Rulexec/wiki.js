var View = Backbone.View.extend({
    initialize: function() {
        this.currentLayout = 'page';
        this.currentView = null;
    },

    toggle: function(_View, model) {
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

        this.currentView = new _View({
            el: $('#' + _View.LAYOUT_ID),
            model: model
        });
        return this.currentView;
    }
});

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

        this.render();
    },

    events: {
        'click #page_edit_button': 'edit',
        'click #page_delete_button': 'del',

        'click #page_delete_confirm_button': 'delete_confirm'
    },

    edit: function() {
        this.trigger('edit');
    },
    del: function() {
        if (!this.model.isMainPage()) {
            this.showDelete();
        }
    },

    showDelete: function() {
        $('#page_delete_modal').modal();
    },

    delete_confirm: function() {
        this.trigger('delete_confirm');
    },

    render: function() {
        var self = this;

        var title = this.model.get('title');
        var content = this.model.get('content');
        var rendered = Wiki.parser.parse(content);

        function createPart(part) {
            var a = $('<a>').attr('href', '#' + part.id).text(part.title);

            if (!part.isExists) {
                a.attr('href', a.attr('href') + '/add').addClass('text-error');
            }

            return $('<li>').append(
                a
            ).append(' '
            ).append(
                $('<span>').addClass('divider').text('/'));
        }
        $('#page_path > :not(.buttons)').remove();
        this.model.parentPages({
            success: function(pages) {
                pages.map(function(part){
                    $('#page_path').append(createPart(part));
                });
                $('#page_path').append(
                    $('<li>').addClass('active').text(title)
                );
            }
        });

        function createUl(tree, prev) {
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
                //ul.append($('<li>').append(createUl(tree[name])));
            }
            if (ul.children().length === 0) {
                return null;
            } else {
                return ul;
            }
        }
        this.model.childs({
            success: function(childs){
                //console.log('childs', childs);
                var ul = createUl(childs, self.model.id);
                if (ul) {
                    $('#page_childs').replaceWith(ul);
                    ul.attr('id', 'page_childs');
                } else {
                    $('#page_childs').empty();
                }
            }
        });

        //$('#page_title').text(title);
        $('#page_content').html(rendered);
        $('#page_delete_modal_page_title').text(title);
    }
}, {LAYOUT_ID: 'page'});

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

var Error404View = Backbone.View.extend({
    initialize: function() {
        this.render();
    },

    render: function() {
        $('#404_create_button').attr('href', '#' + this.model + '/add');
    }
}, {LAYOUT_ID: '404'});

var Error400View = Backbone.View.extend({}, {LAYOUT_ID: '400'});
