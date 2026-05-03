import { useLocation, useNavigate } from "react-router-dom";
import { LeftPanel, RightPanel } from "../components";
import styles from "./AuthPage.module.css";

export const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.endsWith("/signup") ? "signup" : "signin";

  const handleTabChange = (tab: "signin" | "signup") => {
    navigate(`/auth/${tab}`, { replace: true });
  };

  return (
    <div className={styles.page}>
      <LeftPanel />
      <RightPanel activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};
