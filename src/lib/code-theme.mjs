// The one code theme: Shiki's css-variables theme, generated with
// createCssVariablesTheme({ name: "bithuman", variablePrefix: "--sk-", fontStyle: true })
// and kept here as data so the config needs no transitive import. The colours
// live in src/styles/tokens.css (--sk-*), one set per theme.
export const codeTheme = {
 "name": "bithuman",
 "type": "dark",
 "colors": {
  "editor.foreground": "var(--sk-foreground)",
  "editor.background": "var(--sk-background)",
  "terminal.ansiBlack": "var(--sk-ansi-black)",
  "terminal.ansiRed": "var(--sk-ansi-red)",
  "terminal.ansiGreen": "var(--sk-ansi-green)",
  "terminal.ansiYellow": "var(--sk-ansi-yellow)",
  "terminal.ansiBlue": "var(--sk-ansi-blue)",
  "terminal.ansiMagenta": "var(--sk-ansi-magenta)",
  "terminal.ansiCyan": "var(--sk-ansi-cyan)",
  "terminal.ansiWhite": "var(--sk-ansi-white)",
  "terminal.ansiBrightBlack": "var(--sk-ansi-bright-black)",
  "terminal.ansiBrightRed": "var(--sk-ansi-bright-red)",
  "terminal.ansiBrightGreen": "var(--sk-ansi-bright-green)",
  "terminal.ansiBrightYellow": "var(--sk-ansi-bright-yellow)",
  "terminal.ansiBrightBlue": "var(--sk-ansi-bright-blue)",
  "terminal.ansiBrightMagenta": "var(--sk-ansi-bright-magenta)",
  "terminal.ansiBrightCyan": "var(--sk-ansi-bright-cyan)",
  "terminal.ansiBrightWhite": "var(--sk-ansi-bright-white)"
 },
 "tokenColors": [
  {
   "scope": [
    "keyword.operator.accessor",
    "meta.group.braces.round.function.arguments",
    "meta.template.expression",
    "markup.fenced_code meta.embedded.block"
   ],
   "settings": {
    "foreground": "var(--sk-foreground)"
   }
  },
  {
   "scope": "emphasis",
   "settings": {
    "fontStyle": "italic"
   }
  },
  {
   "scope": [
    "strong",
    "markup.heading.markdown",
    "markup.bold.markdown"
   ],
   "settings": {
    "fontStyle": "bold"
   }
  },
  {
   "scope": [
    "markup.italic.markdown"
   ],
   "settings": {
    "fontStyle": "italic"
   }
  },
  {
   "scope": "meta.link.inline.markdown",
   "settings": {
    "fontStyle": "underline",
    "foreground": "var(--sk-token-link)"
   }
  },
  {
   "scope": [
    "string",
    "markup.fenced_code",
    "markup.inline"
   ],
   "settings": {
    "foreground": "var(--sk-token-string)"
   }
  },
  {
   "scope": [
    "comment",
    "string.quoted.docstring.multi"
   ],
   "settings": {
    "foreground": "var(--sk-token-comment)"
   }
  },
  {
   "scope": [
    "constant.numeric",
    "constant.language",
    "constant.other.placeholder",
    "constant.character.format.placeholder",
    "variable.language.this",
    "variable.other.object",
    "variable.other.class",
    "variable.other.constant",
    "meta.property-name",
    "meta.property-value",
    "support"
   ],
   "settings": {
    "foreground": "var(--sk-token-constant)"
   }
  },
  {
   "scope": [
    "keyword",
    "storage.modifier",
    "storage.type",
    "storage.control.clojure",
    "entity.name.function.clojure",
    "entity.name.tag.yaml",
    "support.function.node",
    "support.type.property-name.json",
    "punctuation.separator.key-value",
    "punctuation.definition.template-expression"
   ],
   "settings": {
    "foreground": "var(--sk-token-keyword)"
   }
  },
  {
   "scope": "variable.parameter.function",
   "settings": {
    "foreground": "var(--sk-token-parameter)"
   }
  },
  {
   "scope": [
    "support.function",
    "entity.name.type",
    "entity.other.inherited-class",
    "meta.function-call",
    "meta.instance.constructor",
    "entity.other.attribute-name",
    "entity.name.function",
    "constant.keyword.clojure"
   ],
   "settings": {
    "foreground": "var(--sk-token-function)"
   }
  },
  {
   "scope": [
    "entity.name.tag",
    "string.quoted",
    "string.regexp",
    "string.interpolated",
    "string.template",
    "string.unquoted.plain.out.yaml",
    "keyword.other.template"
   ],
   "settings": {
    "foreground": "var(--sk-token-string-expression)"
   }
  },
  {
   "scope": [
    "punctuation.definition.arguments",
    "punctuation.definition.dict",
    "punctuation.separator",
    "meta.function-call.arguments"
   ],
   "settings": {
    "foreground": "var(--sk-token-punctuation)"
   }
  },
  {
   "scope": [
    "markup.underline.link",
    "punctuation.definition.metadata.markdown"
   ],
   "settings": {
    "foreground": "var(--sk-token-link)"
   }
  },
  {
   "scope": [
    "beginning.punctuation.definition.list.markdown"
   ],
   "settings": {
    "foreground": "var(--sk-token-string)"
   }
  },
  {
   "scope": [
    "punctuation.definition.string.begin.markdown",
    "punctuation.definition.string.end.markdown",
    "string.other.link.title.markdown",
    "string.other.link.description.markdown"
   ],
   "settings": {
    "foreground": "var(--sk-token-keyword)"
   }
  },
  {
   "scope": [
    "markup.inserted",
    "meta.diff.header.to-file",
    "punctuation.definition.inserted"
   ],
   "settings": {
    "foreground": "var(--sk-token-inserted)"
   }
  },
  {
   "scope": [
    "markup.deleted",
    "meta.diff.header.from-file",
    "punctuation.definition.deleted"
   ],
   "settings": {
    "foreground": "var(--sk-token-deleted)"
   }
  },
  {
   "scope": [
    "markup.changed",
    "punctuation.definition.changed"
   ],
   "settings": {
    "foreground": "var(--sk-token-changed)"
   }
  }
 ]
}
;
