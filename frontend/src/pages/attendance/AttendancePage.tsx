import { useState } from 'react';
import { Card, Tabs, Table, DatePicker, Row, Col, Statistic } from 'antd';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

const AttendancePage: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const { data: personalData, isLoading: personalLoading } = useQuery({
    queryKey: ['personalAttendance', dateRange],
    queryFn: () =>
      request.get('/attendance/personal', {
        params: {
          employeeNo: 'EMP001',
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
        },
      }).then((res: any) => res),
  });

  const { RangePicker } = DatePicker;

  const columns = [
    { title: '日期', dataIndex: 'calcDate', key: 'calcDate' },
    { title: '班次', dataIndex: 'shiftName', key: 'shiftName' },
    { title: '上班打卡', dataIndex: 'punchInTime', key: 'punchInTime' },
    { title: '下班打卡', dataIndex: 'punchOutTime', key: 'punchOutTime' },
    { title: '标准工时', dataIndex: 'standardHours', key: 'standardHours' },
    { title: '实际工时', dataIndex: 'actualHours', key: 'actualHours' },
    { title: '加班工时', dataIndex: 'overtimeHours', key: 'overtimeHours' },
  ];

  return (
    <div>
      <Card title="考勤管理">
        <RangePicker
          value={dateRange}
          onChange={(dates) =>
            setDateRange([dates?.[0] || dayjs(), dates?.[1] || dayjs()])
          }
          style={{ marginBottom: 16 }}
        />

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="出勤天数"
                value={personalData?.summary?.totalDays || 0}
                suffix="天"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="标准工时"
                value={personalData?.summary?.totalStandardHours || 0}
                suffix="小时"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="实际工时"
                value={personalData?.summary?.totalActualHours || 0}
                suffix="小时"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="加班工时"
                value={personalData?.summary?.totalOvertimeHours || 0}
                suffix="小时"
              />
            </Card>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={personalData?.results || []}
          rowKey="id"
          loading={personalLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default AttendancePage;
