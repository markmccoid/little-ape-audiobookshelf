import ABSAuthMain from "@/src/screens/Settings/auth/ABSAuthMain";
import React from "react";
import { ScrollView } from "react-native";

import { useHeaderHeight } from "@react-navigation/elements";

const ABSAuth = () => {
  const headerHeight = useHeaderHeight();

  return (
    <ScrollView className="flex-1 " style={{ paddingTop: headerHeight }}>
      <ABSAuthMain />
    </ScrollView>
  );
};

export default ABSAuth;
