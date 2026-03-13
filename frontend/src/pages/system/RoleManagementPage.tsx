import { Card } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import RolePage from './RolePage';

const RoleManagementPage: React.FC = () => {
  return (
    <div>
      <Card
        title="角色管理"
        extra={<KeyOutlined />}
      >
        <RolePage />
      </Card>
    </div>
  );
};

export default RoleManagementPage;
