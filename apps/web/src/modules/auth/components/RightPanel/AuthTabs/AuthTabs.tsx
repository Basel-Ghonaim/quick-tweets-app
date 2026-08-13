import styles from "./AuthTabs.module.css";

type Tab = "signin" | "signup";

interface AuthTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function AuthTabs({ activeTab, onTabChange }: AuthTabsProps) {
  return (
    <div className={styles.container}>
      <div
        className={styles.pill}
        style={{
          transform:
            activeTab === "signin" ? "translateX(0)" : "translateX(100%)",
        }}
      />
      <button
        className={`${styles.tab} ${activeTab === "signin" ? styles.active : ""}`}
        onClick={() => onTabChange("signin")}
      >
        Sign in
      </button>
      <button
        className={`${styles.tab} ${activeTab === "signup" ? styles.active : ""}`}
        onClick={() => onTabChange("signup")}
      >
        Create account
      </button>
    </div>
  );
}
