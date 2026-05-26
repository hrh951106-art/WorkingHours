import { Card } from 'antd';
import SearchConditionsConfig from './components/SearchConditionsConfig';

const SearchConditionsConfigPage: React.FC = () => {
  return (
    <Card title="查询条件管理">
      <SearchConditionsConfig />
    </Card>
  );
};

export default SearchConditionsConfigPage;
