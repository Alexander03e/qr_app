import { useQueueStore } from "@apps/client/store";

export const HomePage = () => {
  const { queueId, ticket } = useQueueStore();
  console.log(ticket, queueId);
  return <div>Home Page</div>;
};
