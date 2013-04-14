var Backend = {};

(function(){

var PAGE_PREFIX = 'wikijspage_';
var CHILD_PREFIX = 'wikijschild_';


// Здесь и далее все операции с Backend'ом вынужденно асинхронны,
// чтобы не нужно было менять синхронный код на асинхронный,
// если вдруг бэкэнд станет асинхронен
Backend.page = {};
Backend.page.get = function(id, callback) {
    var s = localStorage.getItem(PAGE_PREFIX + id);
    if (s) {
        var pageObject = JSON.parse(s);
        pageObject.childs = _getPageChilds(id);
        pageObject.parents = _getPageParents(id);

        setTimeout(function(){ callback(null, pageObject); }, 0);
    } else {
        setTimeout(function(){ callback(Backend.NOT_FOUND); }, 0);
    }
};
Backend.page.create = function(id, fields, callback) {
    if (localStorage.hasOwnProperty(PAGE_PREFIX + id)) {
        callback(Backend.EXISTS);
    } else {
        Backend.page.put(id, fields, callback);
    }
};
Backend.page.put = function(id, fields, callback) {
    localStorage.setItem(PAGE_PREFIX + id, JSON.stringify({
        title: fields.title,
        content: fields.content
    }));

    _updateChildTree(id, true);

    setTimeout(function(){ callback(null); }, 0);
};
Backend.page.remove = function(id, callback) {
    if (id !== 'main_page') {
        localStorage.removeItem(PAGE_PREFIX + id);

        _updateChildTree(id, false);

        setTimeout(function(){ callback(null); }, 0);
    } else {
        setTimeout(function(){ callback(Backend.BAD_ARGUMENTS); }, 0);
    }
};

Backend.pages = {};
Backend.pages.isExists = function(pages, callback) {
    for (var id in pages) if (pages.hasOwnProperty(id)) {
        pages[id] = localStorage.hasOwnProperty(PAGE_PREFIX + id);
    }

    setTimeout(function(){ callback(null, pages) });
};

Backend.NOT_FOUND = 1;
Backend.BAD_ARGUMENTS = 2;
Backend.EXISTS = 3;

Backend._init = function(callback) {
    // FIXME Грязновато, но займёмся этим чуть позже
    if (!localStorage.hasOwnProperty('wikijspage_main_page')) {
        var dumpedRecords = {
            'wikijschild_main_page': '{"exists":false,"child":{"exists":true,"another":{"exists":false,"uuu":{"exists":true}}},"another_child":{"exists":true}}',
            'wikijschild_strange': '{"exists":true,"child":{"exists":true,"ufo":{"exists":false,"super":{"exists":true}}}}',
            'wikijspage_main_page': '{"title":"Главная страница","content":"Пустая \\"главная страница\\". Вы можете её [[main_page/edit отредактировать]].\\n\\nЗдесь есть немного **жирного**, //итальянского// и даже __низкого__.\\n\\nЕсть ссылка на какую-то [[strange странную страницу]]. А ещё у нас есть ещё [[strange/child/ufo/super более странная]]! А не странных страниц у нас [[no нет]], да.\\nИ на какой-то [[http://google.com/ сайт]].\\nИ просто ссылка: [[http://yandex.ru]]"}',
            'wikijspage_main_page/another_child': '{"title":"Ещё один ребёнок","content":"Вот он!"}',
            'wikijspage_main_page/child': '{"title":"main_page/child","content":""}',
            'wikijspage_main_page/child/another/uuu': '{"title":"main_page/child/another/uuu","content":""}',
            'wikijspage_strange': '{"title":"Странная страница","content":"[[strange/child Подстраница]]"}',
            'wikijspage_strange/child': '{"title":"Более странная","content":"Не менее странная."}',
            'wikijspage_strange/child/ufo/super': '{"title":"Супер странная страница","content":"Да-да, она такая!"}'
        };
        for (var name in dumpedRecords) if (dumpedRecords.hasOwnProperty(name)) {
            localStorage.setItem(name, dumpedRecords[name]);
        }
    }

    setTimeout(callback, 0);
};

function _getPageParents(id) {
    // Возвращает массив [{id: pageId, exists: bool, title: pageTitle}]
    function item(id) {
        var s = localStorage.getItem(PAGE_PREFIX + id);
        if (s) {
            return {
                id: id,
                exists: true,
                title: JSON.parse(s).title
            };
        } else {
            return {
                id: id,
                exists: false,
                title: id
            };
        }
    }
    var parts = id.split('/');
    parts.splice(parts.length - 1);
    if (parts.length === 0) return [];

    var _id = parts.shift();

    var result = [item(_id)].concat(parts.map(function(id){
        _id += '/' + id;
        return item(_id);
    }));
    return result;
};
// Далее идёт две функции отвечающие за деревья дочерних элементов
function _updateChildTree(id, to) {
    // Функция проходит по дереву дочерних элементов
    // Если нужно создаёт себе путь (в случае создания),
    // Устанавливает последний элемент в пути в exists:true,
    // Если удаляет, то удаляет "умершую" ветку.
    // FIXME Нужно переписать более понятно.
    var parts = id.split('/');
    var tree = localStorage.getItem(CHILD_PREFIX + parts[0]);
    if (tree) {
        tree = JSON.parse(tree);
    } else {
        tree = {exists: false};
    }

    var t = tree;
    if (to) {
        parts.slice(1).forEach(function(part){
            if (t[part]) {
                t = t[part];
            } else {
                var q = {
                    exists: false
                };
                t[part] = q;
                t = q;
            }
        });

        t.exists = true;
    } else {
        var lastExist = t;
        var partI = 0;
        parts.slice(1).forEach(function(part, i){
            t = t[part];
            if (t.exists && i !== parts.length - 2) {
                lastExist = t;
                partI = i + 1;
            }
        });

        t.exists = false;
        var haveChilds = false;
        for (var name in t) if (t.hasOwnProperty(name)) {
            if (name !== 'exists') {
                haveChilds = true;
                break;
            }
        }

        if (!haveChilds) {
            delete lastExist[parts[partI + 1]];
        }
    }
    
    localStorage.setItem(CHILD_PREFIX + parts[0], JSON.stringify(tree));
}
function _getPageChilds(id) {
    function getPageTitle(id) {
        var page = localStorage.getItem(PAGE_PREFIX + id);
        var title = page ? JSON.parse(page).title : null;

        return title;
    }
    function getTreeNode(tree, path) {
        if (path.length > 0) {
            var p = path.shift();
            if (tree[p]) {
                return getTreeNode(tree[p], path);
            } else {
                return null;
            }
        } else {
            return tree;
        }
    }
    function traverseTree(tree, callback, prev) {
        var isFirst = prev === undefined;
        isFirst && (prev = '');
        for (var name in tree) if (tree.hasOwnProperty(name)) {
            if (name === 'exists' || name === '$title') continue;
            var id = prev + (!isFirst ? '/' : '') + name;
            callback(id, tree[name]);
            traverseTree(tree[name], callback, id);
        }
    }

    var parts = id.split('/');
    var tree = localStorage.getItem(CHILD_PREFIX + parts[0]);
    if (tree) {
        tree = JSON.parse(tree);
    } else {
        return {exists: false};
    }

    var node = getTreeNode(tree, parts.slice(1));
    traverseTree(node, function(name, n){
        n.$title = getPageTitle(id + '/' + name);
        if (!n.$title) {
            n.$title = id + '/' + name;
        }
    });
    return node;
};

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

})();
