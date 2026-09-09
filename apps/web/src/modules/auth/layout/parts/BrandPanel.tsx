import { Typography } from "@shared/design-system";
import { AUTH_COPY } from "@shared/copy";
import styles from "./BrandPanel.module.css";

/**
 * Inert by contract: nothing here is focusable, which is what makes reading and
 * focus order reach the form first without anything to maintain.
 *
 * The sample posts compose no product component. One shaped by a decoration
 * would carry that decoration's assumptions into the feed that has to live
 * with it.
 */
export const BrandPanel = () => (
  <section className={styles.root}>
    <h1 className={styles.headline}>
      <span className={styles.headlineLine}>{AUTH_COPY.brand.headlineLine1}</span>
      <span className={styles.headlineAccent}>{AUTH_COPY.brand.headlineLine2}</span>
    </h1>

    <Typography variant="body-large" tone="secondary" className={styles.tagline}>
      {AUTH_COPY.brand.tagline}
    </Typography>

    <div className={styles.posts} data-testid="brand-posts" aria-hidden="true">
      {AUTH_COPY.samplePosts.map((post) => (
        <article key={post.handle} className={styles.post}>
          <div className={styles.postHead}>
            <span className={styles.postAvatar}>{initials(post.name)}</span>
            <span className={styles.postName}>{post.name}</span>
            <span className={styles.postMeta}>
              {post.handle} · {post.age}
            </span>
          </div>
          <p className={styles.postBody}>{post.body}</p>
        </article>
      ))}
    </div>
  </section>
);

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("");
