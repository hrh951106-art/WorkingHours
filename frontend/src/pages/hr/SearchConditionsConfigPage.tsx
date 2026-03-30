import { Card } from 'antd';
import SearchConditionsConfig from './components/SearchConditionsConfig';

const SearchConditionsConfigPage: React.FC = () => {
  return (
    <Card title="查询条件配置">
      <SearchConditionsConfig />
    </Card>
  );
};

export default SearchConditionsConfigPage;
