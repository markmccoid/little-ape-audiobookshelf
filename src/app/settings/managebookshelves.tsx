import ManageBookshelvesContainer from "@/src/components/settings/manageBookshelves/ManageBookshelvesContainer";
import { useHeaderHeight } from "@react-navigation/elements";
import React from "react";

const ManageBookshelvesRoute = () => {
  const headerHeight = useHeaderHeight();

  return <ManageBookshelvesContainer />;
};

export default ManageBookshelvesRoute;
