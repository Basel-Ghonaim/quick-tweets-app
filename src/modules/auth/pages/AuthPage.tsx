import { useState } from "react";
import { LeftPanel, RightPanel } from "../components";
import styles from "./AuthPage.module.css";

export const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  return (
    <div className={styles.page}>
      <LeftPanel />
      <RightPanel activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
