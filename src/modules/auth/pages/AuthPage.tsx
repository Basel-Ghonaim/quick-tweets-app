import { LeftPanel, RightPanel } from "../components";
import styles from "./AuthPage.module.css";

export const AuthPage = () => {
  return (
    <div className={styles.page}>
      <LeftPanel />
      <RightPanel />
    </div>
  );
};
