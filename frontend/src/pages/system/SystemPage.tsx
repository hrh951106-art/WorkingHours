import { Card } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import UserPage from './UserPage';

const SystemPage: React.FC = () => {
  return (
    <div>
      <Card
        title="用户管理"
        extra={<UserOutlined />}
      >
        <UserPage />
      </Card>
    </div>
  );
};

export default SystemPage;
