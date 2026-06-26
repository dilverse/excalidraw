import { useEffect, useRef } from "react";
import {
  Decoration,
  EditorView,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
  drawSelection,
} from "@codemirror/view";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  redo,
} from "@codemirror/commands";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

import type { Theme } from "@excalidraw/element/types";

import { mermaidLite } from "./mermaid-lang-lite";

export interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyboardSubmit?: () => void;
  placeholder?: string;
  theme: Theme;
  errorLine?: number | null;
}

// ---- Dark theme ----

const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#1a1c1f",
      color: "#f0f0f5",
    },
    ".cm-content": { caretColor: "#fff" },
    ".cm-cursor": { borderLeftColor: "#fff" },
    ".cm-gutters": {
      backgroundColor: "#1a1c1f",
      color: "#c3c7cb",
      border: "none",
    },
    ".cm-activeLineGutter": { backgroundColor: "#2e3034" },
    ".cm-activeLine": { backgroundColor: "#2e3034" },
    ".cm-errorLine": { backgroundColor: "rgba(200, 16, 46, 0.18)" },
  },
  { dark: true },
);

const darkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#3685ff" },
  { tag: tags.string, color: "#b2cada" },
  { tag: tags.comment, color: "#c3c7cb" },
  { tag: tags.number, color: "#ffb3b1" },
  { tag: tags.operator, color: "#f0f0f5" },
  { tag: tags.punctuation, color: "#f0f0f5" },
  { tag: tags.variableName, color: "#f0f0f5" },
  { tag: tags.bracket, color: "#ffb3b1" },
]);

// ---- Light theme ----

const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#ffffff",
    color: "#1a1c1f",
  },
  ".cm-content": { caretColor: "#0c2430" },
  ".cm-cursor": { borderLeftColor: "#0c2430" },
  ".cm-gutters": {
    backgroundColor: "#f9f9fe",
    color: "#73787c",
    border: "none",
  },
  ".cm-activeLineGutter": { backgroundColor: "#ededf2" },
  ".cm-activeLine": { backgroundColor: "#ededf2" },
  ".cm-errorLine": { backgroundColor: "rgba(200, 16, 46, 0.1)" },
});

const lightHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#007aff" },
  { tag: tags.string, color: "#c8102e" },
  { tag: tags.comment, color: "#73787c" },
  { tag: tags.number, color: "#004493" },
  { tag: tags.operator, color: "#1a1c1f" },
  { tag: tags.punctuation, color: "#1a1c1f" },
  { tag: tags.variableName, color: "#0c2430" },
  { tag: tags.bracket, color: "#c8102e" },
]);

// ---- Error line decoration ----

const errorLineDeco = Decoration.line({ class: "cm-errorLine" });

const getErrorLineExtension = (
  errorLine: number | null | undefined,
  doc: { line(n: number): { from: number }; lines: number },
): Extension => {
  if (!errorLine || errorLine < 1 || errorLine > doc.lines) {
    return EditorView.decorations.of(Decoration.none);
  }
  const line = doc.line(errorLine);
  return EditorView.decorations.of(
    Decoration.set([errorLineDeco.range(line.from)]),
  );
};

// ---- Helpers ----

const getThemeExtensions = (theme: Theme) => {
  if (theme === "dark") {
    return [darkTheme, syntaxHighlighting(darkHighlight)];
  }
  return [lightTheme, syntaxHighlighting(lightHighlight)];
};

const CodeMirrorEditor = ({
  value,
  onChange,
  onKeyboardSubmit,
  placeholder,
  theme,
  errorLine,
}: CodeMirrorEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onKeyboardSubmitRef = useRef(onKeyboardSubmit);
  const themeCompartmentRef = useRef(new Compartment());
  const errorLineCompartmentRef = useRef(new Compartment());

  onChangeRef.current = onChange;
  onKeyboardSubmitRef.current = onKeyboardSubmit;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const themeCompartment = themeCompartmentRef.current;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                onKeyboardSubmitRef.current?.();
                return true;
              },
            },
            // historyKeymap binds Mod-Shift-z only on Mac; add it for all platforms
            { key: "Mod-Shift-z", run: redo, preventDefault: true },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          lineNumbers(),
          EditorView.lineWrapping,
          themeCompartment.of(getThemeExtensions(theme)),
          errorLineCompartmentRef.current.of([]),
          mermaidLite(),
          drawSelection({ drawRangeCursor: true }),
          ...(placeholder ? [cmPlaceholder(placeholder)] : []),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    view.focus();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap theme dynamically via compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(
        getThemeExtensions(theme),
      ),
    });
  }, [theme]);

  // Update error line highlight
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    view.dispatch({
      effects: errorLineCompartmentRef.current.reconfigure(
        getErrorLineExtension(errorLine, view.state.doc),
      ),
    });
  }, [errorLine]);

  // Sync external value changes into EditorView
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const currentDoc = view.state.doc.toString();
    if (value !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="ttd-dialog-input ttd-dialog-input--codemirror"
    />
  );
};

export default CodeMirrorEditor;
