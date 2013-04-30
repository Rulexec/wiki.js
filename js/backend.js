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
    function put(id, title, content) {
        localStorage.setItem(PAGE_PREFIX + id, JSON.stringify({
            title: title,
            content: content
        }));

        _updateChildTree(id, true);
    }

    if (!localStorage.hasOwnProperty('wikijspage_main_page')) {
        put('main_page', 'Главная страница', 'Пустая "главная страница". Вы можете её [[main_page/edit отредактировать]].\n\nЗдесь есть немного **жирного**, //итальянского// и даже __низкого__.\n\nЕсть ссылка на какую-то [[strange странную страницу]]. А ещё у нас есть ещё [[strange/child/ufo/super более странная]]! А не странных страниц у нас [[no нет]], да.\nИ на какой-то [[http://google.com/ сайт]].\nИ просто ссылка: [[http://yandex.ru]]\n\nКстати, все изменения сохраняются локально, здесь нет какой-либо серверной части.');
        put('main_page/another_child', 'Ещё один ребёнок', 'Вот он!');
        put('main_page/child', 'Просто обычный ребёнок, пустой внутри', '');
        put('main_page/child/another/uuu', 'Ууу — ребёнок другого ребёнка.', '');
        put('strange', 'Странная страница', '[[strange/child Подстраница]]');
        put('strange/child', 'Более странная', 'Не менее странная.');
        put('strange/child/ufo/super', 'Супер странная страница', 'Да-да, она такая!');
    }

    setTimeout(callback, 0);
};

function _getPageParents(id) {
    // Возвращает массив [{id: pageId, exists: bool, title: pageTitle}]
    function item(id) {
        // Функция возвращает объект с информацией о том,
        // существует ли такая страница и её заголовок
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
    // Проходим по всем частям id'а страницы, узнаём,
    // существуют ли они и получаем заголовки
    var parts = id.split('/').slice(0, -1); // Все части, кроме последней
    if (parts.length === 0) return [];

    var _id = parts.shift();

    return [item(_id)].concat(parts.map(function(id){
        _id += '/' + id;
        return item(_id);
    }));
};
// Далее идёт две функции отвечающие за деревья дочерних элементов
function _updateChildTree(id, to) {
    // Функция проходит по дереву дочерних элементов
    // Если нужно создаёт себе путь (в случае создания),
    // Устанавливает последний элемент в пути в $exists:to,
    // Если удаляет, то удаляет "умершую" ветку.
    var parts = id.split('/');
    var tree = localStorage.getItem(CHILD_PREFIX + parts[0]);
    if (tree) {
        tree = JSON.parse(tree);
    } else {
        tree = {$exists: false};
    }

    function dive(node, path, callback, partI) {
        // Функция погружается по заданному пути в дерево,
        // Если нужно, создаёт нужный путь в дереве, если его нет.
        // Если нода существует, применяет callback на неё.
        if (path.length === 0) return node;
        !partI && (partI = 1);

        var part = path.shift();
        if (node[part]) {
            callback && callback(node[part], partI);
            return dive(node[part], path, callback, partI + 1);
        } else {
            var q = {
                $exists: false
            };
            node[part] = q;
            return dive(node[part], path, callback, partI + 1);
        }
    }
    var t = tree;
    if (to) {
        // Устанавливаем существование последней ноды
        dive(tree, parts.slice(1)).$exists = true;
    } else {
        var lastExist = tree,
            partI = 0;
        var last = dive(tree, parts.slice(1), function(node, i){
            // Если нода существует, запоминаем её и её глубину
            if (node.$exists && i !== parts.length - 1) {
                lastExist = node;
                partI = i;
            }
        });
        last.$exists = false; // забываем про последнюю ноду

        noChilds: {
            for (var name in last) if (last.hasOwnProperty(name) && name !== '$exists') {
                // Если у последней ноды есть ещё дети, то не будем удалять умерший путь
                break noChilds;
            }

            // Иначе удаляем ветку умерших детей
            delete lastExist[parts[partI + 1]];
        }
    }
    
    localStorage.setItem(CHILD_PREFIX + parts[0], JSON.stringify(tree));
}
function _getPageChilds(id) {
    // Функция, строящая дерево дочерних элементов и их заголовков

    function getPageTitle(id) {
        var page = localStorage.getItem(PAGE_PREFIX + id);
        var title = page ? JSON.parse(page).title : null;

        return title;
    }
    function getTreeNode(tree, path) {
        // Получает ноду по заданному пути
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
        // Обход дерева в глубину с применением callback'а
        var isFirst = prev === undefined;
        isFirst && (prev = '');
        for (var name in tree) if (tree.hasOwnProperty(name)) {
            if (name === '$exists') continue;
            var id = prev + (!isFirst ? '/' : '') + name;
            traverseTree(tree[name], callback, id);
            callback(id, tree[name]);
        }
    }

    var parts = id.split('/');
    var tree = localStorage.getItem(CHILD_PREFIX + parts[0]);
    if (tree) {
        tree = JSON.parse(tree);
    } else {
        return {$exists: false};
    }

    var node = getTreeNode(tree, parts.slice(1));
    // Проходит по дереву, назначает $title'сы элементам
    traverseTree(node, function(name, n){
        n.$title = getPageTitle(id + '/' + name);
        if (!n.$title) {
            n.$title = id + '/' + name;
        }
    });
    return node;
};

})();
