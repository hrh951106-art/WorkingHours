import { useState } from 'react';
import { NavBar, List, DatePicker, Button, Empty, SpinLoading, Tag } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { attendanceService } from '@/services/attendance';
import { useAuthStore } from '@/stores/authStore';

export default function PunchRecordsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [dateRange, setDateRange] = useState(() => {
    const now = dayjs();
    return { start: now.startOf('month').format('YYYY-MM-DD'), end: now.format('YYYY-MM-DD') };
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['punchRecords', dateRange, user?.username],
    queryFn: () =>
      attendanceService.getPunchRecords({
        startDate: dateRange.start,
        endDate: dateRange.end,
        employeeNo: user?.username,
      }),
    enabled: !!user?.username,
  });

  const records = data?.data || [];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <NavBar onBack={() => navigate(-1)} style={{ background: '#fff' }}>
        打卡记录
      </NavBar>

      {/* 日期筛选 */}
      <div style={{ display: 'flex', gap: 8, padding: '12px', background: '#fff', marginBottom: 8 }}>
        <Button size="small" onClick={() => setShowStartPicker(true)} style={{ flex: 1 }}>
          {dateRange.start}
        </Button>
        <span style={{ lineHeight: '28px', color: '#999' }}>至</span>
        <Button size="small" onClick={() => setShowEndPicker(true)} style={{ flex: 1 }}>
          {dateRange.end}
        </Button>
      </div>

      <DatePicker
        visible={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        onConfirm={(val) => setDateRange((prev) => ({ ...prev, start: dayjs(val).format('YYYY-MM-DD') }))}
        title="开始日期"
      />
      <DatePicker
        visible={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        onConfirm={(val) => setDateRange((prev) => ({ ...prev, end: dayjs(val).format('YYYY-MM-DD') }))}
        title="结束日期"
      />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><SpinLoading /></div>
      ) : records.length === 0 ? (
        <Empty description="暂无打卡记录" style={{ padding: 48 }} />
      ) : (
        <List>
          {records.map((r) => (
            <List.Item
              key={r.id}
              description={
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {r.deviceName && <Tag color="primary" fill="outline">{r.deviceName}</Tag>}
                  {r.direction && <Tag color="default">{r.direction}</Tag>}
                </div>
              }
              extra={dayjs(r.punchTime).format('HH:mm:ss')}
            >
              {dayjs(r.punchTime).format('YYYY-MM-DD')}
            </List.Item>
          ))}
        </List>
      )}
    </div>
  );
}
