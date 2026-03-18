import { useState, useCallback, useRef, useEffect } from 'react';

interface FocusPosition {
  employeeIndex: number;
  dateIndex: number;
}

interface SelectionRange {
  start: FocusPosition;
  end: FocusPosition;
}

export const useKeyboardGridSelection = (
  employeeCount: number,
  dateCount: number,
  onSelectionChange?: (selectedEmployees: Set<number>, selectedDates: Set<string>) => void
) => {
  const [focusPosition, setFocusPosition] = useState<FocusPosition>({ employeeIndex: 0, dateIndex: 0 });
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  // 获取当前焦点单元格的 key
  const getCellKey = useCallback((employeeIndex: number, dateIndex: number) => {
    return `${employeeIndex}-${dateIndex}`;
  }, []);

  // 获取焦点位置的所有选中员工和日期
  const getSelectedData = useCallback(() => {
    const selectedEmployees = new Set<number>();
    const selectedDates = new Set<string>();

    selectedCells.forEach((cellKey) => {
      const [empIndex, dateIndex] = cellKey.split('-').map(Number);
      selectedEmployees.add(empIndex);
      selectedDates.add(dateIndex.toString());
    });

    return { selectedEmployees, selectedDates };
  }, [selectedCells]);

  // 计算选择范围内的所有单元格
  const calculateRangeCells = useCallback((range: SelectionRange): Set<string> => {
    const cells = new Set<string>();

    const startEmp = Math.min(range.start.employeeIndex, range.end.employeeIndex);
    const endEmp = Math.max(range.start.employeeIndex, range.end.employeeIndex);
    const startDate = Math.min(range.start.dateIndex, range.end.dateIndex);
    const endDate = Math.max(range.start.dateIndex, range.end.dateIndex);

    for (let emp = startEmp; emp <= endEmp; emp++) {
      for (let date = startDate; date <= endDate; date++) {
        cells.add(getCellKey(emp, date));
      }
    }

    return cells;
  }, [getCellKey]);

  // 更新选择
  const updateSelection = useCallback(() => {
    const { selectedEmployees, selectedDates } = getSelectedData();
    onSelectionChange?.(selectedEmployees, selectedDates);
  }, [getSelectedData, onSelectionChange]);

  // 移动焦点
  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right', extendSelection: boolean = false) => {
    setFocusPosition((prev) => {
      let newPosition = { ...prev };

      switch (direction) {
        case 'up':
          newPosition.employeeIndex = Math.max(0, prev.employeeIndex - 1);
          break;
        case 'down':
          newPosition.employeeIndex = Math.min(employeeCount - 1, prev.employeeIndex + 1);
          break;
        case 'left':
          newPosition.dateIndex = Math.max(0, prev.dateIndex - 1);
          break;
        case 'right':
          newPosition.dateIndex = Math.min(dateCount - 1, prev.dateIndex + 1);
          break;
      }

      // 如果按住 Shift，更新选择范围
      if (extendSelection) {
        const newRange: SelectionRange = {
          start: selectionRange?.start || prev,
          end: newPosition
        };
        setSelectionRange(newRange);

        const rangeCells = calculateRangeCells(newRange);
        setSelectedCells(rangeCells);
      } else {
        // 如果没有按 Shift，清除选择范围
        setSelectionRange(null);
        setSelectedCells(new Set());
      }

      return newPosition;
    });
  }, [employeeCount, dateCount, selectionRange, calculateRangeCells]);

  // 切换当前单元格的选中状态
  const toggleCellSelection = useCallback(() => {
    const cellKey = getCellKey(focusPosition.employeeIndex, focusPosition.dateIndex);

    setSelectedCells((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(cellKey)) {
        newSet.delete(cellKey);
      } else {
        newSet.add(cellKey);
      }

      return newSet;
    });

    setSelectionRange(null);
  }, [focusPosition, getCellKey]);

  // 选择所有单元格
  const selectAll = useCallback(() => {
    const allCells = new Set<string>();

    for (let emp = 0; emp < employeeCount; emp++) {
      for (let date = 0; date < dateCount; date++) {
        allCells.add(getCellKey(emp, date));
      }
    }

    setSelectedCells(allCells);
    setSelectionRange(null);

    // 焦点移到第一个单元格
    setFocusPosition({ employeeIndex: 0, dateIndex: 0 });
  }, [employeeCount, dateCount, getCellKey]);

  // 清空选择
  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
    setSelectionRange(null);
  }, []);

  // 删除选中的单元格
  const deleteSelected = useCallback(() => {
    if (selectedCells.size === 0) {
      return false;
    }

    setSelectedCells(new Set());
    setSelectionRange(null);
    return true;
  }, [selectedCells]);

  // 复制选中的单元格
  const copySelected = useCallback(() => {
    if (selectedCells.size === 0) {
      return null;
    }

    const { selectedEmployees, selectedDates } = getSelectedData();

    return {
      selectedEmployees: Array.from(selectedEmployees),
      selectedDates: Array.from(selectedDates),
      cellCount: selectedCells.size
    };
  }, [selectedCells, getSelectedData]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 如果在输入框中，不处理
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    // 检测 Shift 键状态
    if (e.key === 'Shift') {
      setIsShiftPressed(true);
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveFocus('up', e.shiftKey);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveFocus('down', e.shiftKey);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveFocus('left', e.shiftKey);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveFocus('right', e.shiftKey);
        break;
      case ' ':
        e.preventDefault();
        toggleCellSelection();
        break;
    }
  }, [moveFocus, toggleCellSelection]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      setIsShiftPressed(false);
    }
  }, []);

  // 注册键盘事件
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // 当选择改变时，通知父组件
  useEffect(() => {
    updateSelection();
  }, [selectedCells, updateSelection]);

  return {
    focusPosition,
    selectionRange,
    selectedCells,
    isShiftPressed,
    gridRef,
    moveFocus,
    toggleCellSelection,
    selectAll,
    clearSelection,
    deleteSelected,
    copySelected,
    setFocusPosition,
    getCellKey,
  };
};
