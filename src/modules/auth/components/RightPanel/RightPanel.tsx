import { AuthTabs } from "./AuthTabs/AuthTabs";
import { AuthForm } from "./AuthForm/AuthForm";

import styles from "./RightPanel.module.css";

type Tab = "signin" | "signup";

interface RightPanelProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function RightPanel({ activeTab, onTabChange }: RightPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {activeTab === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className={styles.subtitle}>
            {activeTab === "signin"
              ? "Sign in to continue to your account"
              : "Create an account to get started with Quick Tweets"}
          </p>
        </div>

        <AuthTabs activeTab={activeTab} onTabChange={onTabChange} />
        <AuthForm activeTab={activeTab} />
      </div>
    </div>
  );
}
