import { HeroText } from "./HeroText/HeroText";
import styles from "./LeftPanel.module.css";

export function LeftPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.content}>
        <div className={styles.wrapper}>
          <span className={styles.name}>Quick Tweets</span>
        </div>
        <HeroText />
      </div>
    </div>
  );
}
