import { useEffect, useRef } from 'react';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  handler: (e: KeyboardEvent) => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = (
  shortcuts: ShortcutConfig[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true, preventDefault = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // 更新 ref
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否在输入框中
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.getAttribute('contenteditable') === 'true';

      // 如果在输入框中，不处理快捷键（除非是 Escape）
      if (isInputField && e.key !== 'Escape') {
        return;
      }

      // 检查是否有匹配的快捷键
      const matchedShortcut = shortcutsRef.current.find((shortcut) => {
        const keyMatch = shortcut.key.toLowerCase() === e.key.toLowerCase();

        // 处理 Ctrl/Cmd 键（Mac用metaKey，Windows/Linux用ctrlKey）
        let modifierMatch = true;
        if (shortcut.ctrlKey !== undefined || shortcut.metaKey !== undefined) {
          const hasCtrl = shortcut.ctrlKey === true;
          const hasMeta = shortcut.metaKey === true;
          // 如果设置了ctrlKey或metaKey，则需要满足其中一个即可（Ctrl用于Windows/Linux，Cmd用于Mac）
          modifierMatch = (hasCtrl && e.ctrlKey) || (hasMeta && e.metaKey);
        }

        return (
          keyMatch &&
          modifierMatch &&
          (shortcut.shiftKey === undefined || shortcut.shiftKey === e.shiftKey) &&
          (shortcut.altKey === undefined || shortcut.altKey === e.altKey)
        );
      });

      if (matchedShortcut) {
        if (preventDefault) {
          e.preventDefault();
        }
        matchedShortcut.handler(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, preventDefault]);

  return shortcuts;
};

// 快捷键组合预设
export const ShortcutPresets = {
  copy: {
    key: 'c',
    ctrlKey: true, // Windows/Linux
    metaKey: true, // Mac (Cmd)
    description: '复制',
  },
  paste: {
    key: 'v',
    ctrlKey: true, // Windows/Linux
    metaKey: true, // Mac (Cmd)
    description: '粘贴',
  },
  delete: {
    key: 'Delete',
    description: '删除',
  },
  backspace: {
    key: 'Backspace',
    description: '删除',
  },
  selectAll: {
    key: 'a',
    ctrlKey: true, // Windows/Linux
    metaKey: true, // Mac (Cmd)
    description: '全选',
  },
  escape: {
    key: 'Escape',
    description: '取消选择',
  },
};
