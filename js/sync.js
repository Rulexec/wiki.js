(function(){

var PAGE_PREFIX = 'wikijspage_';
var CHILD_PREFIX = 'wikijschild_';

function updateChildTree(id, to) {
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

function readPage(id) {
    var s = localStorage.getItem(PAGE_PREFIX + id);
    q = s;
    return s ? JSON.parse(s) : null;
}
function writePage(page) {
    localStorage.setItem(PAGE_PREFIX + page.id, JSON.stringify({
        title: page.title,
        content: page.content
    }));

    updateChildTree(page.id, true);
}
function deletePage(id) {
    localStorage.removeItem(PAGE_PREFIX + id);

    updateChildTree(id, false);
}

// Операция синхронна, и это немного против правил
// Можно сделать асинхронной и вынести за парсер, но позже
Wiki.isPageExists = function(id) {
    return localStorage.hasOwnProperty(PAGE_PREFIX + id);
};

function getPageTitle(id) {
    var page = localStorage.getItem(PAGE_PREFIX + id);
    var title = page ? JSON.parse(page).title : null;

    return title;
}
Wiki.getPageTitle = function(id, options) {
    var title = getPageTitle(id);
    setTimeout(function(){ options.success(title); }, 0);
};

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
function createEmptyTree(id, path) {
    var o = {
        exists: false,
        $title: id
    };
    if (path.length > 0) {
        var p = path.shift();
        o[p] = createEmptyTree(p, path);
    }
    return o;
}
Wiki.getPageChilds = function(id, options) {
    var parts = id.split('/');
    var tree = localStorage.getItem(CHILD_PREFIX + parts[0]);
    if (tree) {
        tree = JSON.parse(tree);
    } else {
        options.success(createEmptyTree(parts[0], parts.slice(1)));
        return;
    }

    var node = getTreeNode(tree, parts.slice(1));
    if (node) {
        traverseTree(node, function(name, n){
            n.$title = getPageTitle(id + '/' + name);
            if (!n.$title) {
                n.$title = id + '/' + name;
            }
        });
        options.success(node);
    } else {
        // Такого не бывает, выходит, страница ещё не создана
    }
};

Wiki.createIfFirstTime = function() {
    if (!localStorage.hasOwnProperty('wikijspage_main_page')) {
        var dumpedRecords = {
            'wikijschild_main_page': '{"exists":false,"child":{"exists":true,"another":{"exists":false,"uuu":{"exists":true}}},"another_child":{"exists":true}}',
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
};

Backbone.sync = function(method, model, options) {
    if (model instanceof Page) {
        switch (method) {
        case 'read':
            var page = readPage(model.id);
            page = page ? page : {
                title: model.id,
                content: null
            };
            model.set(page);
            options.success();
            break;
        case 'create':
        case 'update':
            writePage(model.attributes);
            options.success();
            break;
        case 'delete':
            deletePage(model.id);
            options.success();
            break;
        default:
            console.log('sync method', method);
        }
    } else {
        console.log('sync model', model);
    }
};

})();
