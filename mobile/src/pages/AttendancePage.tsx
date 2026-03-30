import { useState } from 'react';
import { NavBar, CalendarPicker, Button, Card, Empty, SpinLoading } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { attendanceService } from '@/services/attendance';
import { useAuthStore } from '@/stores/authStore';

export default function AttendancePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [showPicker, setShowPicker] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['personalAttendance', month, user?.username],
    queryFn: () =>
      attendanceService.getPersonalView({
        employeeNo: user?.username || '',
        month,
      }),
    enabled: !!user?.username,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <NavBar onBack={() => navigate(-1)} style={{ background: '#fff' }}>
        个人考勤
      </NavBar>

      <div style={{ padding: 12, background: '#fff', marginBottom: 8 }}>
        <Button block onClick={() => setShowPicker(true)} size="small">
          {month}
        </Button>
      </div>

      <CalendarPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onConfirm={(val) => {
          if (val) setMonth(dayjs(val).format('YYYY-MM'));
          setShowPicker(false);
        }}
        title="选择月份"
      />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><SpinLoading /></div>
      ) : !data ? (
        <Empty description="暂无考勤数据" style={{ padding: 48 }} />
      ) : (
        <Card style={{ margin: 12, borderRadius: 12 }}>
          <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
