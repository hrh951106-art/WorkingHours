import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import MainLayout from './components/layout/MainLayout';

function App() {
  return (
    <Layout>
      <MainLayout />
      <Layout>
        <Outlet />
      </Layout>
    </Layout>
  );
}

export default App;
