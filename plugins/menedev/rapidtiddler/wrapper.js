/*\
title: $:/plugins/menedev/rapidtiddler/rapidtiddler.js
type: application/javascript
module-type: parser

Wraps up the rapidtiddler parser for use as a Parser in TiddlyWiki

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var r = require("$:/plugins/menedev/rapidtiddler/files/rapidtiddlerParser.js");

var RapdiTiddlerParser = function(type, text, options) {
	var element = {
		type: "element",
		tag: "audio",
		attributes: {
			controls: {type: "string", value: "controls"},
			style: {type: "string", value: "width: 100%; object-fit: contain"}
		}
	};
	var link = {
		type: "link",
		attributes: {
			to: {type: "string", value: "toValue"}
		},
		children: [{
			type: "text", text: "linkText"
		}]
	};

	this.tree = [element, link];
};

exports["text/x-rapidtiddler"] = RapdiTiddlerParser;
})();
