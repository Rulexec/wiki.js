all: pegjs

pegjs:
	pegjs -e Wiki.parser parser.pegjs js/parser.js
