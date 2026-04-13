import { Flex } from "antd";
import { Link } from "react-router-dom";

export const DebugPage = () => {
  return (
    <Flex vertical>
      <Link to="/c/1/">client</Link>
      <Link to="/o/1/">operator</Link>
      <Link to="/a/1/">admin</Link>
    </Flex>
  );
};
