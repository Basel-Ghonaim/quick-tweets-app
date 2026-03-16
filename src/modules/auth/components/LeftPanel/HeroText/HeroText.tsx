import styles from "./HeroText.module.css";

export function HeroText() {
  return (
    <div className={styles.wrapper}>
      <h1 className={styles.headline}>
        Your Application,
        <br />
        <span className={styles.accent}>reimagined.</span>
      </h1>
      <p className={styles.subtitle}>
        Tweet Lightly, Shed the complexity and share what’s on your mind in a
        space built for speed and clarity.
      </p>
    </div>
  );
}
