"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import type { Chapter } from "@/app/domain/models";

interface EditorBindingDeps {
  selectedChapter: Chapter | null;
  readingMode: boolean;
  saveChapter: (chapter: Chapter) => Promise<void> | void;
  setOutlineSearchVisible: (visible: boolean) => void;
  setFocusMode: (updater: (current: boolean) => boolean) => void;
}

/**
 * Owns the TipTap editor and the ref-based save flow. onUpdate's closure is
 * created once, so it reads the selected chapter through a ref to avoid saving
 * typed content into whichever chapter was selected when the editor mounted.
 * Debounced autosave; content is reloaded only on chapter switch or external
 * change; pending edits are flushed before switches, on unmount, and on Ctrl+S.
 */
export function useEditorBinding({
  selectedChapter,
  readingMode,
  saveChapter,
  setOutlineSearchVisible,
  setFocusMode,
}: EditorBindingDeps) {
  const selectedChapterRef = useRef<Chapter | null>(null);
  useEffect(() => {
    selectedChapterRef.current = selectedChapter;
  }, [selectedChapter]);
  const editorChapterIdRef = useRef<string | null>(null);
  const pendingEditorSaveRef = useRef<{ chapter: Chapter; content: string } | null>(null);
  const editorSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingEditorSave = useCallback(() => {
    if (editorSaveTimerRef.current) {
      clearTimeout(editorSaveTimerRef.current);
      editorSaveTimerRef.current = null;
    }
    const pending = pendingEditorSaveRef.current;
    pendingEditorSaveRef.current = null;
    if (pending) {
      void saveChapter({ ...pending.chapter, content: pending.content });
    }
  }, [saveChapter]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder:
          "Start writing. AI actions always apply through preview mode in this workspace.",
      }),
    ],
    content: selectedChapter?.content ?? "",
    editable: !readingMode,
    onUpdate: ({ editor: instance }) => {
      const chapter = selectedChapterRef.current;
      if (!chapter || !instance.isEditable) return;
      pendingEditorSaveRef.current = { chapter, content: instance.getHTML() };
      if (editorSaveTimerRef.current) clearTimeout(editorSaveTimerRef.current);
      editorSaveTimerRef.current = setTimeout(flushPendingEditorSave, 500);
    },
  });

  const setEditorContent = useCallback(
    (content: string) => {
      if (!editor) return;
      editor.commands.setContent(content || "", { emitUpdate: false });
    },
    [editor]
  );

  useEffect(() => {
    if (!editor || !selectedChapter) return;
    if (editorChapterIdRef.current !== selectedChapter.id) {
      flushPendingEditorSave();
      editorChapterIdRef.current = selectedChapter.id;
      setEditorContent(selectedChapter.content);
    } else if (
      !pendingEditorSaveRef.current &&
      editor.getHTML() !== selectedChapter.content &&
      !editor.isFocused
    ) {
      setEditorContent(selectedChapter.content);
    }
    editor.setEditable(!readingMode);
  }, [editor, flushPendingEditorSave, readingMode, selectedChapter, setEditorContent]);

  useEffect(() => flushPendingEditorSave, [flushPendingEditorSave]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const command = event.metaKey || event.ctrlKey;
      const chapter = selectedChapterRef.current;
      if (!command || !chapter) return;

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!editor) return;
        pendingEditorSaveRef.current = null;
        if (editorSaveTimerRef.current) clearTimeout(editorSaveTimerRef.current);
        void saveChapter({ ...chapter, content: editor.getHTML() });
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        setOutlineSearchVisible(true);
      }

      if (event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFocusMode((current) => !current);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor, saveChapter, setFocusMode, setOutlineSearchVisible]);

  return { editor, setEditorContent, flushPendingEditorSave };
}
