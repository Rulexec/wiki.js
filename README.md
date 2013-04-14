wiki.js
=======

wiki.js — это wiki-javascript-фронтенд.

В данный момент хранит все свои данные локально в localStorage.

# Фичи
* Страницы
  * Базовая разметка
    * ``**bold**``
    * ``//italic//``
    * ``__underscore__``
  * Ссылки
    * [[wiki/link Вики-ссылка]]
    * [[http://rulexec.github.io/wiki.js/]]
    * [[http://rulexec.github.io/wiki.js/ внешняя ссылка]] с текстом
* Дочерние страницы (если есть страница **page** и **page/child**, то на странице page будет список, в котором есть ссылка на **page/child**)

# Технологии
* [Backbone.js](http://backbonejs.org/) — каркас приложения
* [localStorage](http://www.w3.org/TR/webstorage/) — хранение данных
* [PEG.js](http://pegjs.majda.cz/) — генератор парсера разметки
* [jQuery](http://jquery.com/) — работа с DOM
* [Bootstrap](http://twitter.github.io/bootstrap/) — вёрстка
