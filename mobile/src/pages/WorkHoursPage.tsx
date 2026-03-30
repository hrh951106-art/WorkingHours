import { useState } from 'react';
import { NavBar, List, DatePicker, Button, Empty, SpinLoading, Tag, Card } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { attendanceService } from '@/services/attendance';
import { useAuthStore } from '@/stores/authStore';

export default function WorkHoursPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [dateRange, setDateRange] = useState(() => {
    const now = dayjs();
    return { start: now.startOf('month').format('YYYY-MM-DD'), end: now.format('YYYY-MM-DD') };
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['calcResults', dateRange, user?.username],
    queryFn: () =>
      attendanceService.getCalcResults({
        startDate: dateRange.start,
        endDate: dateRange.end,
        employeeNo: user?.username,
      }),
    enabled: !!user?.username,
  });

  const results = data?.data || [];

  // 汇总
  const totalWork = results.reduce((sum, r) => sum + (r.workHours || 0), 0);
  const totalOT = results.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <NavBar onBack={() => navigate(-1)} style={{ background: '#fff' }}>
        工时结果
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

      {/* 汇总卡片 */}
      {results.length > 0 && (
        <Card style={{ margin: '0 12px 8px', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#22B970' }}>{totalWork.toFixed(1)}</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>总工时(h)</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{totalOT.toFixed(1)}</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>加班(h)</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{results.length}</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>天数</div>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><SpinLoading /></div>
      ) : results.length === 0 ? (
        <Empty description="暂无工时数据" style={{ padding: 48 }} />
      ) : (
        <List>
          {results.map((r) => (
            <List.Item
              key={r.id}
              description={
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {r.shiftName && <Tag color="primary" fill="outline">{r.shiftName}</Tag>}
                  {r.lateMinutes > 0 && <Tag color="danger">迟到{r.lateMinutes}分</Tag>}
                  {r.earlyMinutes > 0 && <Tag color="warning">早退{r.earlyMinutes}分</Tag>}
                </div>
              }
              extra={
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: '#22B970' }}>{r.workHours}h</div>
                  {r.overtimeHours > 0 && (
                    <div style={{ fontSize: 12, color: '#f59e0b' }}>+{r.overtimeHours}h加班</div>
                  )}
                </div>
              }
            >
              {dayjs(r.calcDate).format('MM-DD')} {r.employeeName}
            </List.Item>
          ))}
        </List>
      )}
    </div>
  );
}
