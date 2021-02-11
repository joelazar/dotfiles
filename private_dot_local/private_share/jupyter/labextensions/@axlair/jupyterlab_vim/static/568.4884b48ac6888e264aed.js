(self.webpackChunk_axlair_jupyterlab_vim=self.webpackChunk_axlair_jupyterlab_vim||[]).push([[568],{568:(e,o,t)=>{"use strict";t.r(o),t.d(o,{default:()=>s});var n=t(253),d=t(208),l=t(608);const c=!!navigator.platform.match(/Mac/i),i={id:"jupyterlab_vim",autoStart:!0,activate:function(e,o,t){return Promise.all([e.restored]).then((async([d])=>{const{commands:c,shell:i}=e;await t.ensureVimKeymap();const s=t.CodeMirror;function m(e){const t=o.currentWidget;return!1!==e.activate&&t&&i.activateById(t.id),t}function r(){return null!==o.currentWidget&&o.currentWidget===e.shell.currentWidget}c.addCommand("run-select-next-edit",{label:"Run Cell and Edit Next Cell",execute:e=>{const o=m(e);if(o){const{context:e,content:t}=o;n.NotebookActions.runAndAdvance(t,e.sessionContext),o.content.mode="edit"}},isEnabled:r}),c.addCommand("run-cell-and-edit",{label:"Run Cell and Edit Cell",execute:e=>{const o=m(e);if(o){const{context:e,content:t}=o;n.NotebookActions.run(t,e.sessionContext),o.content.mode="edit"}},isEnabled:r}),c.addCommand("cut-cell-and-edit",{label:"Cut Cell(s) and Edit Cell",execute:e=>{const o=m(e);if(o){const{content:e}=o;n.NotebookActions.cut(e),e.mode="edit"}},isEnabled:r}),c.addCommand("copy-cell-and-edit",{label:"Copy Cell(s) and Edit Cell",execute:e=>{const o=m(e);if(o){const{content:e}=o;n.NotebookActions.copy(e),e.mode="edit"}},isEnabled:r}),c.addCommand("paste-cell-and-edit",{label:"Paste Cell(s) and Edit Cell",execute:e=>{const o=m(e);if(o){const{content:e}=o;n.NotebookActions.paste(e,"below"),e.mode="edit"}},isEnabled:r}),c.addCommand("merge-and-edit",{label:"Merge and Edit Cell",execute:e=>{const o=m(e);if(o){const{content:e}=o;n.NotebookActions.mergeCells(e),o.content.mode="edit"}},isEnabled:r}),c.addCommand("enter-insert-mode",{label:"Enter Insert Mode",execute:e=>{const o=m(e);if(o){const{content:e}=o;if(null!==e.activeCell){const t=e.activeCell.editor;o.content.mode="edit",s.Vim.handleKey(t.editor,"i")}}},isEnabled:r}),c.addCommand("leave-insert-mode",{label:"Leave Insert Mode",execute:e=>{const o=m(e);if(o){const{content:e}=o;if(null!==e.activeCell){const o=e.activeCell.editor;s.Vim.handleKey(o.editor,"<Esc>")}}},isEnabled:r}),c.addCommand("select-below-execute-markdown",{label:"Execute Markdown and Select Cell Below",execute:e=>{const o=m(e);if(o){const{content:e}=o;return null!==e.activeCell&&"markdown"===e.activeCell.model.type&&(o.content.activeCell.rendered=!0),n.NotebookActions.selectBelow(o.content)}},isEnabled:r}),c.addCommand("select-above-execute-markdown",{label:"Execute Markdown and Select Cell Below",execute:e=>{const o=m(e);if(o){const{content:e}=o;return null!==e.activeCell&&"markdown"===e.activeCell.model.type&&(o.content.activeCell.rendered=!0),n.NotebookActions.selectAbove(o.content)}},isEnabled:r}),c.addCommand("select-first-cell",{label:"Select First Cell",execute:e=>{const o=m(e);if(o){const{content:e}=o;e.activeCellIndex=0,e.deselectAll(),null!==e.activeCell&&l.ElementExt.scrollIntoViewIfNeeded(e.node,e.activeCell.node)}},isEnabled:r}),c.addCommand("select-last-cell",{label:"Select Last Cell",execute:e=>{const o=m(e);if(o){const{content:e}=o;e.activeCellIndex=o.content.widgets.length-1,e.deselectAll(),null!==e.activeCell&&l.ElementExt.scrollIntoViewIfNeeded(e.node,e.activeCell.node)}},isEnabled:r}),c.addCommand("center-cell",{label:"Center Cell",execute:e=>{const o=m(e);if(o&&null!==o.content.activeCell){const e=o.content.activeCell.inputArea.node.getBoundingClientRect();o.content.scrollToPosition(e.bottom,0)}},isEnabled:r}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl O","U"],command:"notebook:undo-cell-action"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl O","-"],command:"notebook:split-cell-at-cursor"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl O","D"],command:"cut-cell-and-edit"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl O","Y"],command:"copy-cell-and-edit"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl O","P"],command:"paste-cell-and-edit"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl Shift J"],command:"notebook:extend-marked-cells-below"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Ctrl Shift J"],command:"notebook:extend-marked-cells-below"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl Shift K"],command:"notebook:extend-marked-cells-above"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Ctrl Shift K"],command:"notebook:extend-marked-cells-above"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl O","Shift O"],command:"notebook:insert-cell-above"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl O","Ctrl O"],command:"notebook:insert-cell-above"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl O","O"],command:"notebook:insert-cell-below"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl J"],command:"select-below-execute-markdown"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl K"],command:"select-above-execute-markdown"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Escape"],command:"leave-insert-mode"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl ["],command:"leave-insert-mode"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Ctrl I"],command:"enter-insert-mode"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl Enter"],command:"run-cell-and-edit"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Shift Enter"],command:"run-select-next-edit"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Shift Escape"],command:"notebook:enter-command-mode"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Shift M"],command:"merge-and-edit"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Accel 1"],command:"notebook:change-cell-to-code"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Accel 2"],command:"notebook:change-cell-to-markdown"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Accel 3"],command:"notebook:change-cell-to-raw"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl O","G"],command:"select-first-cell"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl O","Ctrl G"],command:"select-last-cell"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["G","G"],command:"select-first-cell"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Shift G"],command:"select-last-cell"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Y","Y"],command:"notebook:copy-cell"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["D","D"],command:"notebook:cut-cell"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Shift P"],command:"notebook:paste-cell-above"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["P"],command:"notebook:paste-cell-below"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["O"],command:"notebook:insert-cell-below"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Shift O"],command:"notebook:insert-cell-above"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["U"],command:"notebook:undo-cell-action"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Ctrl E"],command:"notebook:move-cell-down"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Ctrl Y"],command:"notebook:move-cell-up"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Z","Z"],command:"center-cell"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Z","C"],command:"notebook:hide-cell-code"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Z","O"],command:"notebook:show-cell-code"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Z","M"],command:"notebook:hide-all-cell-code"}),c.addKeyBinding({selector:".jp-Notebook:focus",keys:["Z","R"],command:"notebook:show-all-cell-code"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode",keys:["Ctrl O","Z","Z"],command:"center-cell"}),c.addKeyBinding({selector:".jp-Notebook.jp-mod-editMode .jp-InputArea-editor:not(.jp-mod-has-primary-selection)",keys:["Ctrl G"],command:"tooltip:launch-notebook"}),new a(e,o,s)})),Promise.resolve()},requires:[n.INotebookTracker,d.ICodeMirror]};class a{constructor(e,o,t){this._tracker=o,this._app=e,this._cm=t,this._onActiveCellChanged(),this._tracker.activeCellChanged.connect(this._onActiveCellChanged,this)}_onActiveCellChanged(){const e=this._tracker.activeCell;if(null!==e){const{commands:o}=this._app,t=e.editor;t.setOption("keyMap","vim");const n=t.getOption("extraKeys")||{};n.Esc=this._cm.prototype.leaveInsertMode,c||(n["Ctrl-C"]=!1),this._cm.prototype.save=()=>{o.execute("docmanager:save")},t.setOption("extraKeys",n);const d=this._cm.Vim;d.defineEx("quit","q",(e=>{o.execute("notebook:enter-command-mode")})),this._cm.Vim.handleKey(t.editor,"<Esc>"),d.defineMotion("moveByLinesOrCell",((t,n,d,l)=>{const c=n;let i=c.ch;const a=e;switch(l.lastMotion){case"moveByLines":case"moveByDisplayLines":case"moveByScroll":case"moveToColumn":case"moveToEol":case"moveByLinesOrCell":i=l.lastHPos;break;default:l.lastHPos=i}const s=d.repeat+(d.repeatOffset||0),m=d.forward?c.line+s:c.line-s,r=t.firstLine(),k=t.lastLine();return m<r||m>k?(null!==a&&"markdown"===a.model.type&&(a.rendered=!0),void(d.forward?o.execute("notebook:move-cursor-down"):o.execute("notebook:move-cursor-up"))):(l.lastHSPos=t.charCoords(this._cm.Pos(m,i),"div").left,this._cm.Pos(m,i))})),d.mapCommand("k","motion","moveByLinesOrCell",{forward:!1,linewise:!0},{context:"normal"}),d.mapCommand("j","motion","moveByLinesOrCell",{forward:!0,linewise:!0},{context:"normal"}),d.defineAction("moveCellDown",((e,t)=>{o.execute("notebook:move-cell-down")})),d.defineAction("moveCellUp",((e,t)=>{o.execute("notebook:move-cell-up")})),d.mapCommand("<C-e>","action","moveCellDown",{},{extra:"normal"}),d.mapCommand("<C-y>","action","moveCellUp",{},{extra:"normal"}),d.defineAction("splitCell",((e,t)=>{o.execute("notebook:split-cell-at-cursor")})),d.mapCommand("-","action","splitCell",{},{extra:"normal"})}}}const s=i}}]);