// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

(function(mod) {
    console.log(mod);
      mod(CodeMirror);
  })(function(CodeMirror) {
    "use strict";
  
    CodeMirror.defineMode("rapidtiddler", function() {
      return {
        token: function(stream, state) {
          var m;
          if (state.state == "start" || state.state == "whitespace") {
            if (m = stream.match(/\/[^\s]*/)) {
                state.state = "text";
                state.type = m[1];
                return "action";
            }
            if (m = stream.match(/@[^\s]+/)) {
                state.state = "text";
                state.type = m[1];
                return "at";
            }
            if (m = stream.match(/#[^\s]+/)) {
                state.state = "text";
                state.type = m[1];
                return "rapid-tag";
            }

            var next = stream.peek();
            if (next == "@") {
                stream.next();
                return "lonely-at";
            }
            if (next == "#") {
                stream.next();
                return "lonely-tag";
            }
        }
        
        if (m = stream.match(/\[\[[^\]]+\]\]/)) {
            state.state = "text";
            state.type = m[1];

            return "rapid-link";
        }

        if (m = stream.match(/\[\[\]\]/)) {
            state.state = "text";
            state.type = m[1];
            return "empty-rapid-link";
        }

        if (m = stream.match(/\[\[[^\]]+\]/)) {
            state.state = "text";
            state.type = m[1];
            return "halfclosed-rapid-link";
        }

        if (m = stream.match(/\[\[[^\]]*/)) {
            state.state = "text";
            state.type = m[1];
            var peek = stream.peek();
            if (peek != "]") {
                return "unclosed-rapid-link";
            }
            return "halfclosed-rapid-link";
        }

        if (m = stream.match(/\s+/)) {
            state.state = "whitespace";
            state.type = m[1];
            return "whitespace";
        }
            
        if (m = stream.match(/[^\s]+/)) {
            state.state = "text";
            state.type = m[1];

            return "text";
        }

            var next = stream.next();
            state.state = "text";
            return "text";
        },
        blankLine: function(state) {
          if (state.state == "headers") state.state = "body";
        },
        startState: function() {
          return {state: "start", type: null};
        }
      };
    });
  
    CodeMirror.defineMIME("text/x-rapidtiddler", "rapidtiddler");
    CodeMirror.registerHelper("hint", "rapidtiddler", function (editor, options) {
        //var list = Session.get(Template.strSessionDistinctFields) || [];
        var cursor = editor.getCursor();
        var token = editor.getTokenAt(cursor);
        var list = [];
        var startOffset = 0;
        var endOffset = 0;

        if (token.type == "lonely-at") {
            list = $tw.wiki.getTiddlers();
        }

        if (token.type == "at") {
            startOffset = 1;
            list = $tw.wiki.getTiddlers()
                .filter(t =>
                    // remove "@"
                    t.startsWith(token.string.substring(1))
                );
        }

        if (token.type == "unclosed-rapid-link") {
            startOffset = 2;
            list = $tw.wiki.getTiddlers()
                .filter(t =>
                    // remove "[["
                    t.startsWith(token.string.substring(2))
                ).map(t => t + "]]");
        }

        if (token.type == "halfclosed-rapid-link") {
            startOffset = 2;
            list = $tw.wiki.getTiddlers()
                .filter(t =>
                    // remove "[["
                    t.startsWith(token.string.substring(2).slice(0, -1))
                ).map(t => t + "]]");
        }

        if (token.type == "rapid-link" || token.type == "empty-rapid-link") {
            startOffset = 2;
            list = $tw.wiki.getTiddlers()
                .filter(t =>
                    // remove "[["
                    t.startsWith(token.string.substring(2).slice(0, -2))
                ).map(t => t + "]]");
        }

        if (token.type == "lonely-tag") {
            list = Object.keys($tw.wiki.getTagMap())
                .filter(t => !t.startsWith("$:/"));
        }

        if (token.type == "rapid-tag") {
            startOffset = 1;
            list = Object.keys($tw.wiki.getTagMap())
                .filter(t => !t.startsWith("$:/"))
                .filter(t =>
                    // remove "#"
                    t.startsWith(token.string.substring(1))
                )
                .map(t => "#" + t)
                ;
        }

        if (token.type == "action") {
            startOffset = 1;
            console.log("eachShadowPlusTiddlers");
            $tw.wiki.eachShadowPlusTiddlers(tiddler => list.push(tiddler.fields.title));
            list = list
                .filter(t => t.startsWith("$:/plugins/menedev/rapidtiddler/action" + token.string))
                .map(t => t.substring("$:/plugins/menedev/rapidtiddler/action".length + 1))
                ;
        }

        var start = token.start + startOffset;
        var end = token.end;
        var result = {
            list: list,
            from: CodeMirror.Pos(cursor.line, start),
            to: CodeMirror.Pos(cursor.line, end)
        };

        return result;
    });

    CodeMirror.defineOption("apply-rapidtiddler-widgets", true, function(cm, val, old) {
        var mode = cm.getMode();
        if (mode.name != "rapidtiddler") return;

        function makeTranscludeWidget(title,options) {
            options = options || {};
            var parseTreeDiv = {tree: [{
                    type: "element",
                    tag: "span",
                    children: []}]},
                parseTreeImportVariables = {
                    type: "importvariables",
                    attributes: {
                        filter: {
                            name: "filter",
                            type: "string"
                        }
                    },
                    isBlock: false,
                    children: []},
                parseTreeTransclude = {
                    type: "transclude",
                    attributes: {
                        tiddler: {
                            name: "tiddler",
                            type: "string",
                            value: title}},
                    isBlock: !options.parseAsInline};
            if(options.importVariables || options.importPageMacros) {
                if(options.importVariables) {
                    parseTreeImportVariables.attributes.filter.value = options.importVariables;
                } else if(options.importPageMacros) {
                    parseTreeImportVariables.attributes.filter.value = "[[$:/core/ui/PageMacros]] [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]";
                }
                parseTreeDiv.tree[0].children.push(parseTreeImportVariables);
                parseTreeImportVariables.children.push(parseTreeTransclude);
            } else {
                parseTreeDiv.tree[0].children.push(parseTreeTransclude);
            }
            if(options.field) {
                parseTreeTransclude.attributes.field = {type: "string", value: options.field};
            }
            if(options.mode) {
                parseTreeTransclude.attributes.mode = {type: "string", value: options.mode};
            }
            if(options.children) {
                parseTreeTransclude.children = options.children;
            }
            return $tw.wiki.makeWidget(parseTreeDiv,options);
        };

        function linkFor(tiddler) {
            var a = document.createElement("a");
            a.setAttribute("href", "#" + tiddler);

            // var text = document.createTextNode("->");
            // a.appendChild(text);

            // var span = document.createElement("span");
            var widget = makeTranscludeWidget("$:/plugins/menedev/rapidtiddler/widget/link", {mode: "inline", variables: {target: tiddler, currentTiddler: cm.options.tiddler}, document: document});
            widget.render(a, null);

            return a;
        }
        
        function todoWidget(name) {
            var span = document.createElement("span");
            var tiddler = $tw.wiki.getTiddler("$:/plugins/menedev/rapidtiddler/action" + name)
            if (!tiddler) {
                return;
            }

            var widget = makeTranscludeWidget(tiddler.fields.title, {mode: "inline", variables: {currentTiddler: cm.options.tiddler}, document: document});
            widget.render(span, null);

            return span;
        }

        function decorateLine(cm, line, cursor) {
            var tokens = cm.getLineTokens(line);
            for (var t of tokens) {
                var arr = cm.doc.findMarksAt({line: line, ch: t.start});
                for (var bookmark of arr) {
                    bookmark.clear();
                }

                if (t.type == "rapid-link") {
                    var marker = cm.doc.markText({line: line, ch: t.start}, {line: line, ch: t.end},
                        {inclusiveLeft: false, inclusiveRight: false, clearOnEnter: false});
                    var bookmark = cm.doc.setBookmark({line: line, ch: t.start},
                        {
                            widget: linkFor(t.string.slice(2, -2)),
                            insertLeft: true
                        }
                    );
                    marker.on("clear", function() {
                        bookmark.clear();
                    });
                }


                if (t.type == "action") {
                    var widget = todoWidget(t.string);
                    if (widget) {                    
                        var marker = cm.doc.markText({line: line, ch: t.start}, {line: line, ch: t.end},
                            {inclusiveLeft: false, inclusiveRight: false, clearOnEnter: false});
                        var bookmark = cm.doc.setBookmark({line: line, ch: t.start},
                            {
                                widget: widget,
                                insertLeft: true
                            }
                        );
                        marker.on("clear", function() {
                            bookmark.clear();
                        });
                    }
                }
            }
        }

        function handleUpdate(cm, change) {
            console.log(arguments);
            for (var line = change.from.line; line <= change.to.line; line++) {
                decorateLine(cm, line);
            }
        }

        cm.on("change", handleUpdate);
        // cm.on("cursorActivity", handleUpdate);
        var initialized = false;
        cm.on("update", function(cm) {
            if (initialized) return;
            initialized = true;

            console.log(arguments);
            var lineCount = cm.doc.lineCount();
            for (var i = 0; i < lineCount; i++) {
                decorateLine(cm, i);
            }
        });
    });
  });