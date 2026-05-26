import { useState } from 'react';
import { Space, Select, DatePicker, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface DatePeriodSelectorProps {
  value?: [dayjs.Dayjs, dayjs.Dayjs];
  onChange?: (dates: [dayjs.Dayjs, dayjs.Dayjs]) => void;
  onRefresh?: () => void;
  loading?: boolean;
  style?: React.CSSProperties;
}

const PERIOD_OPTIONS = [
  { label: '今天', value: 'today' },
  { label: '本周', value: 'thisWeek' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
  { label: '本季度', value: 'thisQuarter' },
  { label: '本年', value: 'thisYear' },
  { label: '自定义', value: 'custom' },
];

const DatePeriodSelector: React.FC<DatePeriodSelectorProps> = ({
  value,
  onChange,
  onRefresh,
  loading = false,
  style,
}) => {
  const [periodType, setPeriodType] = useState<string>('thisMonth');

  // 根据周期类型计算日期范围
  const getDateRangeByPeriod = (period: string): [dayjs.Dayjs, dayjs.Dayjs] => {
    const now = dayjs();

    switch (period) {
      case 'today':
        return [now.startOf('day'), now.endOf('day')];

      case 'thisWeek':
        return [now.startOf('week'), now.endOf('week')];

      case 'thisMonth':
        return [now.startOf('month'), now.endOf('month')];

      case 'lastMonth':
        const lastMonth = now.subtract(1, 'month');
        return [lastMonth.startOf('month'), lastMonth.endOf('month')];

      case 'thisQuarter':
        return [now.startOf('quarter'), now.endOf('quarter')];

      case 'thisYear':
        return [now.startOf('year'), now.endOf('year')];

      default:
        return [now.startOf('month'), now.endOf('month')];
    }
  };

  // 处理周期类型变化
  const handlePeriodChange = (newPeriod: string) => {
    setPeriodType(newPeriod);

    if (newPeriod !== 'custom') {
      const dateRange = getDateRangeByPeriod(newPeriod);
      onChange?.(dateRange);
    }
  };

  // 处理自定义日期范围变化
  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      onChange?.([dates[0], dates[1]]);
    }
  };

  return (
    <Space style={style}>
      <Select
        value={periodType}
        onChange={handlePeriodChange}
        style={{ width: 120 }}
        options={PERIOD_OPTIONS}
      />

      {periodType === 'custom' && (
        <RangePicker
          value={value}
          onChange={handleDateRangeChange}
          style={{ width: 280 }}
        />
      )}

      {periodType !== 'custom' && value && (
        <span style={{ color: '#666', fontSize: 14 }}>
          {value[0].format('YYYY-MM-DD')} ~ {value[1].format('YYYY-MM-DD')}
        </span>
      )}

      <Button
        icon={<ReloadOutlined />}
        onClick={onRefresh}
        loading={loading}
      >
        刷新
      </Button>
    </Space>
  );
};

export default DatePeriodSelector;
