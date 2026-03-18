import { useState, useCallback } from 'react';

interface ClipboardSchedule {
  id: number;
  shiftId: number;
  shiftName: string;
  shiftColor?: string;
  adjustedStart?: string;
  adjustedEnd?: string;
  segments?: any[];
}

interface ClipboardData {
  schedules: ClipboardSchedule[];
  copiedAt: number;
}

export const useScheduleClipboard = () => {
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [clipboardSource, setClipboardSource] = useState<{
    employeeIds: number[];
    date: string;
  } | null>(null);

  const copy = useCallback((
    employeeIds: number[],
    date: string,
    schedules: ClipboardSchedule[]
  ) => {
    setClipboard({
      schedules,
      copiedAt: Date.now(),
    });
    setClipboardSource({
      employeeIds,
      date,
    });
  }, []);

  const paste = useCallback((
    targetEmployeeIds: number[],
    targetDates: string[]
  ): ClipboardSchedule[] | null => {
    if (!clipboard) return null;

    // 如果复制的是单个员工的排班，粘贴到多个员工
    // 如果复制的是多个员工的排班，按顺序粘贴
    const result: ClipboardSchedule[] = [];

    if (targetEmployeeIds.length > 0 && targetDates.length > 0) {
      // 生成目标位置的排班数据
      targetEmployeeIds.forEach((empId) => {
        targetDates.forEach((date) => {
          clipboard.schedules.forEach((schedule) => {
            result.push({
              ...schedule,
              id: undefined as any, // 清除原ID，创建新排班
            });
          });
        });
      });
    }

    return result;
  }, [clipboard]);

  const clear = useCallback(() => {
    setClipboard(null);
    setClipboardSource(null);
  }, []);

  const isValid = useCallback(() => {
    if (!clipboard) return false;

    // 剪贴板数据在 30 分钟内有效
    const validDuration = 30 * 60 * 1000;
    return Date.now() - clipboard.copiedAt < validDuration;
  }, [clipboard]);

  const getClipboardInfo = useCallback(() => {
    if (!clipboard || !isValid()) {
      return null;
    }

    return {
      scheduleCount: clipboard.schedules.length,
      source: clipboardSource,
      copiedAt: clipboard.copiedAt,
    };
  }, [clipboard, clipboardSource, isValid]);

  return {
    clipboard,
    clipboardSource,
    copy,
    paste,
    clear,
    isValid,
    getClipboardInfo,
  };
};
