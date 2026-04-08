import { useParams } from "react-router-dom";

export const AdminAppInner = () => {
  const { queueId } = useParams();

  return <div>Admin App {queueId}</div>;
};

export const AdminApp = () => {
  return <AdminAppInner />;
};
